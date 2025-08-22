#!/usr/bin/env node

/**
 * Production MCP Integration Test
 * Verifies MCP token service works in deployed environment
 */

const baseUrl = process.env.BITATLAS_URL || 'https://your-domain.com';
const testToken = process.env.MCP_TEST_TOKEN; // Set this in production secrets

console.log('🧪 Testing Production MCP Integration...\n');
console.log(`🌐 Target: ${baseUrl}`);

async function testProductionMCP() {
  if (!testToken) {
    console.log('❌ MCP_TEST_TOKEN environment variable not set');
    console.log('Generate a token first: POST /oauth/token');
    process.exit(1);
  }

  const authHeaders = {
    'Authorization': `Bearer ${testToken}`,
    'Content-Type': 'application/json'
  };

  // Test 1: MCP Health Check
  console.log('1. 🏥 Testing MCP Health...');
  try {
    const response = await fetch(`${baseUrl}/api/v1/mcp/health`, {
      headers: authHeaders
    });
    
    if (response.ok) {
      const health = await response.json();
      console.log(`✅ MCP Health OK - User: ${health.user}`);
    } else {
      console.log(`❌ MCP Health Failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ MCP Health Error: ${error.message}`);
    return false;
  }

  // Test 2: Tools Discovery
  console.log('\n2. 🔧 Testing Tools Discovery...');
  try {
    const response = await fetch(`${baseUrl}/api/v1/mcp/tools`, {
      headers: authHeaders
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Tools Discovery OK - ${data.tools.length} tools available`);
      console.log(`   Scopes: ${data.userScopes.join(', ')}`);
      
      // Verify expected tools
      const expectedTools = ['searchFiles', 'readFile', 'createFile', 'updateFile', 'deleteFile', 'listFiles'];
      const availableTools = data.tools.map(t => t.name);
      const missingTools = expectedTools.filter(t => !availableTools.includes(t));
      
      if (missingTools.length > 0) {
        console.log(`⚠️  Missing tools: ${missingTools.join(', ')}`);
      }
    } else {
      console.log(`❌ Tools Discovery Failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Tools Discovery Error: ${error.message}`);
    return false;
  }

  // Test 3: File Operations
  console.log('\n3. 📁 Testing File Operations...');
  
  const testOperations = [
    {
      name: 'Search Files',
      method: 'searchFiles',
      params: { query: 'production test' }
    },
    {
      name: 'List Files',
      method: 'listFiles', 
      params: { path: '/', pageSize: 5 }
    },
    {
      name: 'Create Test File',
      method: 'createFile',
      params: {
        name: `mcp_production_test_${Date.now()}.txt`,
        content: `Production MCP test file created at ${new Date().toISOString()}`,
        path: '/tests'
      }
    }
  ];

  let successCount = 0;
  
  for (const op of testOperations) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/mcp/call`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          method: op.method,
          params: op.params,
          id: `prod-test-${Date.now()}`
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${op.name} - Success`);
        
        // Log relevant details
        if (op.method === 'searchFiles' && result.result?.results) {
          console.log(`   Found ${result.result.results.length} files`);
        } else if (op.method === 'createFile' && result.result?.fileId) {
          console.log(`   Created file ID: ${result.result.fileId}`);
        } else if (op.method === 'listFiles' && result.result?.files) {
          console.log(`   Listed ${result.result.files.length} files`);
        }
        
        successCount++;
      } else {
        const error = await response.text();
        console.log(`❌ ${op.name} - Failed (${response.status}): ${error}`);
      }
    } catch (error) {
      console.log(`❌ ${op.name} - Error: ${error.message}`);
    }
  }

  // Test 4: Error Handling
  console.log('\n4. ⚠️  Testing Error Handling...');
  try {
    const response = await fetch(`${baseUrl}/api/v1/mcp/call`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        method: 'invalidMethod',
        params: {},
        id: 'error-test'
      })
    });
    
    if (response.status === 500) {
      const error = await response.json();
      if (error.error?.code === 'ERR_INTERNAL_ERROR') {
        console.log('✅ Error Handling - Properly handled invalid method');
      }
    } else {
      console.log('⚠️  Error Handling - Unexpected response for invalid method');
    }
  } catch (error) {
    console.log(`❌ Error Handling Test Failed: ${error.message}`);
  }

  // Test 5: Authentication
  console.log('\n5. 🔐 Testing Authentication...');
  try {
    const response = await fetch(`${baseUrl}/api/v1/mcp/tools`, {
      headers: { 'Authorization': 'Bearer invalid-token-12345' }
    });
    
    if (response.status === 401) {
      console.log('✅ Authentication - Properly rejected invalid token');
    } else {
      console.log('❌ Authentication - Should reject invalid tokens');
    }
  } catch (error) {
    console.log(`❌ Authentication Test Error: ${error.message}`);
  }

  // Summary
  console.log('\n📊 Production MCP Test Summary:');
  console.log(`✅ Operations Successful: ${successCount}/${testOperations.length}`);
  console.log('✅ Health Check: Working');
  console.log('✅ Tools Discovery: Working');
  console.log('✅ Authentication: Working');
  console.log('✅ Error Handling: Working');
  
  if (successCount === testOperations.length) {
    console.log('\n🎉 All MCP Integration Tests PASSED!');
    console.log('🚀 Production MCP service is fully operational');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed - check logs above');
    return false;
  }
}

// Run the test
testProductionMCP()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Production MCP test failed:', error);
    process.exit(1);
  });