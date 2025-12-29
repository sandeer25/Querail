const API_KEY = 'sk-8c62234855b2e75b1f871e9dde8f9703b250b7c5ecdcea646b314350021d433a';
const API_URL = 'http://localhost:3000';

async function testInference() {
  console.log('Testing inference API...\n');

  try {
    const response = await fetch(`${API_URL}/v1/infer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        prompt: 'Explain how neural networks work in simple terms',
        budget: 0.50,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Inference successful!\n');
      console.log('Response:');
      console.log('---');
      console.log(data.content);
      console.log('---\n');
      console.log('Usage:');
      console.log(`Input tokens: ${data.usage.inputTokens}`);
      console.log(`Output tokens: ${data.usage.outputTokens}`);
      console.log(`Total tokens: ${data.usage.totalTokens}\n`);
      console.log('Cost:');
      console.log(`Input cost: $${data.cost.inputCost.toFixed(6)}`);
      console.log(`Output cost: $${data.cost.outputCost.toFixed(6)}`);
      console.log(`Total cost: $${data.cost.totalCost.toFixed(6)}\n`);
      console.log('Model:', data.model);
      console.log('Vendor:', data.vendor);
      console.log('Truncated:', data.truncated);
    } else {
      console.error('Request failed:', data);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testInference();