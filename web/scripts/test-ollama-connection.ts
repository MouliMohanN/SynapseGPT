import { OllamaEmbeddings } from "@langchain/ollama";
import { Ollama } from "ollama";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

async function testOllamaConnection() {
  try {
    console.log("🔍 Testing Ollama connection...");
    console.log(`   URL: ${OLLAMA_URL}\n`);

    // Test basic connection
    const ollama = new Ollama({ host: OLLAMA_URL });
    
    console.log("📋 Fetching available models...");
    const models = await ollama.list();
    
    console.log(`\n✅ Found ${models.models.length} model(s):`);
    models.models.forEach((model) => {
      console.log(`   - ${model.name} (${(model.size / 1e9).toFixed(2)} GB)`);
    });

    // Test embedding model
    console.log("\n🧪 Testing nomic-embed-text embeddings...");
    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: OLLAMA_URL,
    });

    const testText = "This is a test sentence for embeddings.";
    const embedding = await embeddings.embedQuery(testText);
    
    console.log(`   ✓ Generated embedding with ${embedding.length} dimensions`);
    console.log(`   Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(", ")}...]`);

    console.log("\n✅ Ollama connection test successful!");
  } catch (error) {
    console.error("❌ Error testing Ollama connection:", error);
    process.exit(1);
  }
}

testOllamaConnection().catch(console.error);
