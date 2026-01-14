/**
 * Test script for the enrich-profile API endpoint
 * 
 * Run this with: node --loader ts-node/esm scripts/test-enrich.ts
 * Or use the API directly after starting the dev server
 */

// Example test cases
const testCases = [
  {
    name: "Satya Nadella",
    company: "Microsoft",
    description: "CEO of major tech company"
  },
  {
    name: "Jensen Huang",
    company: "NVIDIA",
    description: "CEO in AI/GPU space"
  },
  {
    name: "John Doe",
    company: "Unknown Corp",
    description: "Unknown person (should return mystery guest)"
  }
];

async function testEnrichProfile(testCase: { name: string; company?: string; linkedin_url?: string }) {
  console.log(`\n🔍 Testing: ${testCase.name}${testCase.company ? ` at ${testCase.company}` : ''}`);
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch('http://localhost:3000/api/enrich-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Success!');
      console.log('\n📝 Summary:');
      data.data.summary.forEach((bullet: string, i: number) => {
        console.log(`   ${i + 1}. ${bullet}`);
      });
      console.log('\n🏷️  Tags:', data.data.industry_tags.join(', '));
      console.log(`\n📊 Sources found: ${data.data.sources_found}`);
    } else {
      console.log('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Instructions for manual testing
console.log(`
╔════════════════════════════════════════════════════════════╗
║           ENRICH PROFILE API - TEST GUIDE                  ║
╚════════════════════════════════════════════════════════════╝

📋 MANUAL TESTING STEPS:

1. Start your dev server:
   npm run dev

2. Test with curl or Postman:

   curl -X POST http://localhost:3000/api/enrich-profile \\
     -H "Content-Type: application/json" \\
     -d '{"name": "Satya Nadella", "company": "Microsoft"}'

3. Expected Response:
   {
     "success": true,
     "data": {
       "summary": [
         "Bullet point 1 about the person",
         "Bullet point 2 about achievements",
         "Bullet point 3 about expertise"
       ],
       "industry_tags": ["Tech", "Leadership", "AI"],
       "sources_found": 5
     }
   }

🧪 TEST CASES TO TRY:

1. Famous CEO:
   { "name": "Satya Nadella", "company": "Microsoft" }

2. With LinkedIn URL:
   { 
     "name": "Tim Cook",
     "linkedin_url": "linkedin.com/in/timcook"
   }

3. Unknown person (Mystery Guest fallback):
   { "name": "Random Person", "company": "Unknown" }

4. Missing name (should return 400 error):
   { "company": "Test Corp" }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 TIP: Check your terminal logs to see the API processing steps:
   [Enrich] Processing...
   [Tavily] Searching...
   [OpenAI] Generating summary...

`);

// Example usage with fetch (once server is running)
export { testEnrichProfile, testCases };
