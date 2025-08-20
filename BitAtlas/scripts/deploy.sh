#!/bin/bash

set -euo pipefail

# BitAtlas Deployment Script
# Handles deployment, updates, and rollbacks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/opt/bitatlas/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Show usage
usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    deploy      Deploy or update the application
    start       Start all services
    stop        Stop all services  
    restart     Restart all services
    status      Show service status
    logs        Show service logs
    backup      Create backup
    restore     Restore from backup
    rollback    Rollback to previous version
    health      Check application health
    update      Update to latest version

Options:
    -f, --force         Force operation without confirmation
    -v, --verbose       Enable verbose output
    -e, --env FILE      Use specific environment file
    -h, --help          Show this help message

Examples:
    $0 deploy                    # Deploy application
    $0 start                     # Start services
    $0 logs backend              # Show backend logs
    $0 backup --force            # Create backup without confirmation
    $0 restore backup-20240120   # Restore specific backup
EOF
}

# Check if Docker and Docker Compose are available
check_dependencies() {
    local deps=("docker")
    
    # Check for docker-compose or docker compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif docker compose version &> /dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
    else
        log_error "Docker Compose not found"
        exit 1
    fi
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is required but not installed"
            exit 1
        fi
    done
}

# Load environment variables
load_environment() {
    local env_file="${ENV_FILE:-.env}"
    
    if [[ -f "$env_file" ]]; then
        set -a
        source "$env_file"
        set +a
        log_info "Loaded environment from $env_file"
    else
        log_error "Environment file $env_file not found"
        exit 1
    fi
    
    # Load production secrets if available
    if [[ -f "secrets.production.env" ]]; then
        set -a
        source "secrets.production.env"
        set +a
        log_info "Loaded production secrets"
    fi
}

# Pre-deployment checks
pre_deploy_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check disk space
    local available_space
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 5242880 ]]; then  # 5GB
        log_error "Insufficient disk space (less than 5GB available)"
        exit 1
    fi
    
    # Check environment variables
    local required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "FRONTEND_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check if ports are available
    local ports=(80 443)
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_warning "Port $port is already in use"
        fi
    done
    
    log_success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log_info "Creating backup: $backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup database
    if $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T postgres pg_isready -U bitatlas; then
        log_info "Backing up database..."
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T postgres pg_dump -U bitatlas bitatlas | gzip > "$backup_path/database.sql.gz"
    fi
    
    # Backup uploads
    if [[ -d "${DATA_PATH:-/opt/bitatlas/data}/uploads" ]]; then
        log_info "Backing up uploads..."
        tar -czf "$backup_path/uploads.tar.gz" -C "${DATA_PATH:-/opt/bitatlas/data}" uploads/
    fi
    
    # Backup configuration
    if [[ -f ".env" ]]; then
        cp .env "$backup_path/env.backup"
    fi
    
    # Create backup metadata
    cat > "$backup_path/metadata.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "environment": "${NODE_ENV:-production}",
  "backup_type": "full"
}
EOF
    
    log_success "Backup created: $backup_path"
    echo "$backup_name"
}

# Restore from backup
restore_backup() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup not found: $backup_name"
        exit 1
    fi
    
    log_warning "This will restore from backup and may overwrite current data"
    if [[ "${FORCE:-false}" != "true" ]]; then
        read -p "Continue? [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi
    
    log_info "Restoring from backup: $backup_name"
    
    # Stop services
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" down
    
    # Restore database
    if [[ -f "$backup_path/database.sql.gz" ]]; then
        log_info "Restoring database..."
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d postgres
        sleep 10  # Wait for postgres to be ready
        zcat "$backup_path/database.sql.gz" | $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T postgres psql -U bitatlas bitatlas
    fi
    
    # Restore uploads
    if [[ -f "$backup_path/uploads.tar.gz" ]]; then
        log_info "Restoring uploads..."
        tar -xzf "$backup_path/uploads.tar.gz" -C "${DATA_PATH:-/opt/bitatlas/data}/"
    fi
    
    # Restore environment
    if [[ -f "$backup_path/env.backup" ]]; then
        cp "$backup_path/env.backup" .env
        log_info "Environment restored"
    fi
    
    log_success "Restore completed"
}

# Deploy application
deploy() {
    log_info "Starting deployment..."
    
    pre_deploy_checks
    
    # Create backup before deployment
    local backup_name
    if [[ "${SKIP_BACKUP:-false}" != "true" ]]; then
        backup_name=$(create_backup)
    fi
    
    # Pull latest images
    log_info "Pulling latest images..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" pull
    
    # Build images
    log_info "Building images..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" build --no-cache
    
    # Deploy with zero-downtime using rolling update
    log_info "Deploying services..."
    
    # Start databases first
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for databases to be healthy
    log_info "Waiting for databases to be ready..."
    timeout 60 sh -c 'until $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec postgres pg_isready -U bitatlas; do sleep 1; done'
    timeout 60 sh -c 'until $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec redis redis-cli --pass "${REDIS_PASSWORD}" ping; do sleep 1; done'
    
    # Deploy application services
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Run health checks
    if ! check_health; then
        log_error "Health checks failed after deployment"
        if [[ -n "${backup_name:-}" ]]; then
            log_info "Rolling back..."
            restore_backup "$backup_name"
        fi
        exit 1
    fi
    
    # Clean up old images
    docker image prune -f
    
    log_success "Deployment completed successfully!"
    
    # Show status
    service_status
}

# Check application health
check_health() {
    local max_attempts=30
    local attempt=1
    
    log_info "Checking application health..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Show service status
service_status() {
    log_info "Service Status:"
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps
    
    echo
    log_info "Service Health:"
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T backend curl -f -s http://localhost:3000/health | jq '.' 2>/dev/null || echo "Backend health check failed"
}

# Show logs
show_logs() {
    local service="${1:-}"
    local follow="${2:-false}"
    
    if [[ -n "$service" ]]; then
        if [[ "$follow" == "true" ]]; then
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs -f "$service"
        else
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=100 "$service"
        fi
    else
        if [[ "$follow" == "true" ]]; then
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs -f
        else
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs --tail=100
        fi
    fi
}

# Main function
main() {
    cd "$PROJECT_ROOT"
    
    local command="${1:-help}"
    shift || true
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--force)
                FORCE=true
                shift
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            -e|--env)
                ENV_FILE="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
    
    check_dependencies
    load_environment
    
    case $command in
        deploy)
            deploy
            ;;
        start)
            log_info "Starting services..."
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d
            service_status
            ;;
        stop)
            log_info "Stopping services..."
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" down
            ;;
        restart)
            log_info "Restarting services..."
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" restart
            service_status
            ;;
        status)
            service_status
            ;;
        logs)
            show_logs "$1" "${2:-false}"
            ;;
        backup)
            create_backup
            ;;
        restore)
            if [[ -z "${1:-}" ]]; then
                log_error "Backup name required for restore"
                exit 1
            fi
            restore_backup "$1"
            ;;
        health)
            check_health
            ;;
        update)
            log_info "Updating application..."
            git pull origin main || log_warning "Git pull failed or not in git repository"
            deploy
            ;;
        help|*)
            usage
            exit 0
            ;;
    esac
}

main "$@"