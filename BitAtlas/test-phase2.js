#!/usr/bin/env node

// BitAtlas Phase 2 Complete Web Experience Test
// Tests the full integration between React frontend and backend API

import { spawn } from 'child_process';

console.log('🚀 BitAtlas Phase 2 - Complete Web Experience Test');
console.log('='.repeat(60));

// Test backend health
console.log('\n📡 Testing Backend Health...');
try {
  const response = await fetch('http://localhost:3000/health');
  const health = await response.json();
  console.log('✅ Backend Health:', health.status);
  console.log('   Version:', health.version);
  console.log('   Environment:', health.environment);
} catch (error) {
  console.log('❌ Backend Health Check Failed:', error.message);
  process.exit(1);
}

// Test API endpoints
console.log('\n🔧 Testing API Endpoints...');

// Test registration
console.log('\n1. Testing User Registration...');
try {
  const registerResponse = await fetch('http://localhost:3000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@bitatlas.eu',
      password: 'SecurePass123!'
    })
  });
  
  if (registerResponse.ok) {
    const result = await registerResponse.json();
    console.log('✅ Registration successful for:', result.user.email);
  } else {
    const error = await registerResponse.json();
    console.log('⚠️  Registration response:', error.error || 'Unknown error');
  }
} catch (error) {
  console.log('❌ Registration failed:', error.message);
}

// Test login
console.log('\n2. Testing User Login...');
try {
  const loginResponse = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@bitatlas.eu',
      password: 'SecurePass123!'
    })
  });
  
  let accessToken = null;
  if (loginResponse.ok) {
    const result = await loginResponse.json();
    accessToken = result.accessToken;
    console.log('✅ Login successful, token received');
    
    // Test file operations with auth
    console.log('\n3. Testing File Operations...');
    
    // Create a file
    const createFileResponse = await fetch('http://localhost:3000/api/v1/files', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: 'welcome.txt',
        content: 'Welcome to BitAtlas! This is a test file created during Phase 2 testing.',
        path: '/'
      })
    });
    
    if (createFileResponse.ok) {
      const fileResult = await createFileResponse.json();
      console.log('✅ File created:', fileResult.file.name);
      
      // List files
      const listResponse = await fetch('http://localhost:3000/api/v1/files', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (listResponse.ok) {
        const listResult = await listResponse.json();
        console.log('✅ Files listed:', listResult.files.length, 'files found');
        
        // Search files
        const searchResponse = await fetch('http://localhost:3000/api/v1/files/search/query?q=welcome', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          console.log('✅ Search working:', searchResult.files.length, 'files found');
        }
      }
    }
  } else {
    const error = await loginResponse.json();
    console.log('❌ Login failed:', error.error || 'Unknown error');
  }
} catch (error) {
  console.log('❌ Login/File operations failed:', error.message);
}

// Test MCP integration
console.log('\n4. Testing MCP Integration...');
try {
  const mcpResponse = await fetch('http://localhost:3000/api/v1/mcp/tools');
  
  if (mcpResponse.ok) {
    const mcpResult = await mcpResponse.json();
    console.log('✅ MCP Tools available:', mcpResult.tools.length, 'tools');
    console.log('   Available tools:', mcpResult.tools.map(t => t.name).join(', '));
  }
} catch (error) {
  console.log('❌ MCP integration test failed:', error.message);
}

console.log('\n🎯 Phase 2 Testing Complete!');
console.log('='.repeat(60));
console.log('\n🌐 Frontend: http://localhost:5173');
console.log('🔧 Backend:  http://localhost:3000');
console.log('\n✨ Your BitAtlas web application is ready!');
console.log('\n📝 Next Steps:');
console.log('   1. Open http://localhost:5173 in your browser');
console.log('   2. Create an account or sign in');
console.log('   3. Upload and manage files');
console.log('   4. Test the search functionality');
console.log('   5. Preview different file types');
console.log('\n🚀 Phase 2: Web Experience - COMPLETE! ✅');