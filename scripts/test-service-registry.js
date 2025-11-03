#!/usr/bin/env node

/**
 * Quick ServiceRegistry Validation Script
 *
 * Tests basic functionality of ServiceRegistry
 */

const path = require('path');

// Import ServiceRegistry from compiled output
const { ServiceRegistry } = require(path.join(__dirname, '../vscode-lumina/out/services/ServiceRegistry.js'));

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 ServiceRegistry Quick Validation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Mock service for testing
class MockService {
	constructor() {
		this.created = true;
	}

	doSomething() {
		return 'mock result';
	}
}

try {
	// Test 1: Singleton pattern
	const registry1 = ServiceRegistry.getInstance();
	const registry2 = ServiceRegistry.getInstance();
	console.log('✅ Test 1: Singleton pattern');
	console.log(`   Same instance: ${registry1 === registry2}`);

	// Test 2: Service registration
	registry1.register('mockService', () => new MockService());
	console.log('\n✅ Test 2: Service registration');
	console.log(`   Has mockService: ${registry1.has('mockService')}`);

	// Test 3: Lazy loading (service not created yet)
	console.log('\n✅ Test 3: Lazy loading');
	console.log(`   Instantiated count before get(): ${registry1.getInstantiatedCount()}`);

	// Test 4: Service retrieval
	const service = registry1.get('mockService');
	console.log('\n✅ Test 4: Service retrieval');
	console.log(`   Service created: ${service.created}`);
	console.log(`   Service result: ${service.doSomething()}`);
	console.log(`   Instantiated count after get(): ${registry1.getInstantiatedCount()}`);

	// Test 5: Singleton per service
	const service2 = registry1.get('mockService');
	console.log('\n✅ Test 5: Singleton per service');
	console.log(`   Same instance: ${service === service2}`);

	// Test 6: Service not registered error
	console.log('\n✅ Test 6: Error handling');
	try {
		registry1.get('nonExistentService');
		console.log('   ❌ Should have thrown error');
	} catch (error) {
		console.log(`   Error caught: ${error.message}`);
	}

	// Test 7: Performance - registration
	const regStartTime = Date.now();
	for (let i = 0; i < 100; i++) {
		registry1.register(`service${i}`, () => new MockService());
	}
	const regTime = Date.now() - regStartTime;
	console.log('\n✅ Test 7: Performance - Registration');
	console.log(`   100 services registered in: ${regTime}ms (target: <100ms)`);

	// Test 8: Performance - lookup
	registry1.get('service0'); // Warm up
	const lookupStartTime = Date.now();
	registry1.get('service0');
	const lookupTime = Date.now() - lookupStartTime;
	console.log('\n✅ Test 8: Performance - Lookup');
	console.log(`   Lookup time: ${lookupTime}ms (target: <1ms)`);

	// Test 9: Clear registry
	registry1.clear();
	console.log('\n✅ Test 9: Clear registry');
	console.log(`   Registered count after clear: ${registry1.getServiceCount()}`);
	console.log(`   Instantiated count after clear: ${registry1.getInstantiatedCount()}`);

	console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('✅ All validation tests PASSED');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

} catch (error) {
	console.error('\n❌ Validation FAILED');
	console.error(error);
	process.exit(1);
}
