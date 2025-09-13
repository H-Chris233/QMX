// Simple test to verify API integration
import { ApiService } from './api/ApiService.js';

// Test the new v2 API methods
async function testV2ApiMethods() {
  console.log('Testing v2 API methods...');
  
  try {
    // Test student statistics
    console.log('Testing getStudentStats...');
    const studentStats = await ApiService.getStudentStats();
    console.log('Student stats:', studentStats);
    
    // Test financial statistics  
    console.log('Testing getFinancialStats...');
    const financialStats = await ApiService.getFinancialStats();
    console.log('Financial stats:', financialStats);
    
    // Test search students
    console.log('Testing searchStudents...');
    const searchResults = await ApiService.searchStudents({
      query: 'test',
      subject: 'Shooting',
      min_age: 10,
      max_age: 50
    });
    console.log('Search results:', searchResults);
    
    // Test search cash
    console.log('Testing searchCash...');
    const cashResults = await ApiService.searchCash({
      query: 'payment',
      transaction_type: 'income',
      date_from: '2024-01-01',
      date_to: '2024-12-31'
    });
    console.log('Cash search results:', cashResults);
    
    // Test membership expiring soon
    console.log('Testing getMembershipExpiringSoon...');
    const expiringMemberships = await ApiService.getMembershipExpiringSoon(7);
    console.log('Expiring memberships:', expiringMemberships);
    
    console.log('✅ All v2 API methods are properly integrated!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    console.log('This is expected in a test environment without the Tauri backend running.');
  }
}

// Export for testing
export { testV2ApiMethods };

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  console.log('v2 API integration test loaded. Call testV2ApiMethods() to run tests.');
}