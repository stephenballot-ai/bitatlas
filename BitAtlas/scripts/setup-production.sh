#!/bin/bash

set -euo pipefail

# BitAtlas Production Setup Script
# This script prepares the environment for production deployment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_PATH="${DATA_PATH:-/opt/bitatlas/data}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is required but not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is required but not installed"
        exit 1
    fi
    
    # Check Node.js (for secret generation)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found. Installing via package manager..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y nodejs npm
        elif command -v yum &> /dev/null; then
            sudo yum install -y nodejs npm
        else
            log_error "Please install Node.js manually"
            exit 1
        fi
    fi
    
    # Check available disk space (minimum 10GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [[ $AVAILABLE_SPACE -lt 10485760 ]]; then  # 10GB in KB
        log_warning "Less than 10GB available disk space. Consider freeing up space."
    fi
    
    log_success "System requirements check passed"
}

# Create directory structure
create_directories() {
    log_info "Creating directory structure..."
    
    # Create data directories with proper permissions
    sudo mkdir -p "$DATA_PATH"/{postgres,redis,uploads,logs,secrets,backups}
    sudo chown -R "$(whoami):$(whoami)" "$DATA_PATH"
    chmod 750 "$DATA_PATH"
    chmod 700 "$DATA_PATH/secrets"
    
    # Create log directories
    sudo mkdir -p /var/log/bitatlas
    sudo chown -R "$(whoami):$(whoami)" /var/log/bitatlas
    
    log_success "Directory structure created"
}

# Generate secrets
generate_secrets() {
    log_info "Generating production secrets..."
    
    cd "$PROJECT_ROOT"
    
    if [[ ! -f "secrets.production.env" ]]; then
        if [[ -f "package.json" ]]; then
            npm install --only=production
            node scripts/generate-secrets.js
        else
            log_error "package.json not found. Please run from project root."
            exit 1
        fi
    else
        log_warning "Production secrets already exist. Skipping generation."
        read -p "Do you want to regenerate secrets? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            node scripts/generate-secrets.js
        fi
    fi
    
    log_success "Secrets generated"
}

# Setup environment file
setup_environment() {
    log_info "Setting up environment configuration..."
    
    cd "$PROJECT_ROOT"
    
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            log_success "Created .env from template"
            log_warning "Please edit .env file with your production values"
        else
            log_error ".env.example not found"
            exit 1
        fi
    else
        log_warning ".env file already exists"
    fi
    
    # Validate required environment variables
    log_info "Validating environment configuration..."
    
    REQUIRED_VARS=(
        "DATABASE_URL"
        "REDIS_URL" 
        "JWT_SECRET"
        "FRONTEND_URL"
        "OAUTH_CLIENT_ID"
        "OAUTH_CLIENT_SECRET"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" .env 2>/dev/null; then
            log_error "Required variable $var not found in .env file"
            exit 1
        fi
    done
    
    log_success "Environment configuration validated"
}

# Setup SSL certificates
setup_ssl() {
    log_info "Setting up SSL certificates..."
    
    read -p "Do you have SSL certificates? [y/N]: " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter path to SSL certificate file: " CERT_PATH
        read -p "Enter path to SSL private key file: " KEY_PATH
        
        if [[ -f "$CERT_PATH" && -f "$KEY_PATH" ]]; then
            # Add to .env file
            echo "SSL_CERT_PATH=$CERT_PATH" >> .env
            echo "SSL_KEY_PATH=$KEY_PATH" >> .env
            log_success "SSL certificates configured"
        else
            log_error "SSL certificate files not found"
            exit 1
        fi
    else
        log_warning "SSL not configured. Consider setting up SSL certificates for production"
        log_info "You can use Let's Encrypt: sudo certbot certonly --standalone -d your-domain.com"
    fi
}

# Configure firewall
setup_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        read -p "Configure UFW firewall? [Y/n]: " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            sudo ufw --force reset
            sudo ufw default deny incoming
            sudo ufw default allow outgoing
            
            # Allow SSH
            sudo ufw allow ssh
            
            # Allow HTTP/HTTPS
            sudo ufw allow 80/tcp
            sudo ufw allow 443/tcp
            
            # Enable firewall
            sudo ufw --force enable
            
            log_success "Firewall configured"
        fi
    else
        log_warning "UFW not available. Please configure firewall manually"
    fi
}

# Setup Docker volumes
setup_volumes() {
    log_info "Setting up Docker volumes..."
    
    # Export DATA_PATH for docker-compose
    export DATA_PATH
    
    # Ensure all volume directories exist
    for dir in postgres redis uploads logs secrets; do
        mkdir -p "$DATA_PATH/$dir"
    done
    
    log_success "Docker volumes prepared"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create logrotate configuration
    cat > /tmp/logrotate.conf << 'EOF'
/var/log/bitatlas/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        docker-compose -f docker-compose.prod.yml restart backend
    endscript
}
EOF
    
    sudo mv /tmp/logrotate.conf /etc/logrotate.d/bitatlas
    
    log_success "Monitoring configured"
}

# Main setup function
main() {
    log_info "Starting BitAtlas production setup..."
    
    check_root
    check_requirements
    create_directories
    generate_secrets
    setup_environment
    setup_ssl
    setup_firewall
    setup_volumes
    setup_monitoring
    
    log_success "Production setup completed!"
    echo
    log_info "Next steps:"
    echo "1. Review and customize .env file"
    echo "2. Source production secrets: source secrets.production.env"
    echo "3. Deploy with: docker-compose -f docker-compose.prod.yml up -d"
    echo "4. Check health: curl http://localhost/health"
    echo
    log_warning "Important:"
    echo "- Keep secrets.production.env secure and never commit it"
    echo "- Regular backup your data directory: $DATA_PATH"
    echo "- Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
}

# Run main function
main "$@"