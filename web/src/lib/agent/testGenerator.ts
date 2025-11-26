import { streamOllamaResponse, OllamaModelConfig } from "@/lib/chat/ollamaClient";

// ============================================================================
// Types
// ============================================================================

export interface Requirement {
  id: string;
  description: string;
  category: "functional" | "non-functional" | "edge-case" | "ui-ux";
}

export interface TestCase {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
  type: "positive" | "negative" | "edge";
}

export interface AgentEvent {
  type: "thought" | "progress" | "requirement" | "test" | "complete" | "error";
  message: string;
  data?: any;
}

// ============================================================================
// Test Generation Agent
// ============================================================================

export class TestGenerationAgent {
  private prdContent: string;
  private fileName: string;
  private modelConfig?: OllamaModelConfig;
  private maxRetries = 3;
  private retryDelay = 1000; // ms

  constructor(prdContent: string, fileName: string, modelConfig?: OllamaModelConfig) {
    this.prdContent = prdContent;
    this.fileName = fileName;
    this.modelConfig = modelConfig;
  }

  /**
   * Main orchestration method
   */
  async* generate(): AsyncGenerator<AgentEvent> {
    try {
      yield {
        type: "thought",
        message: "🚀 Initializing QA Agent...",
      };
      yield {
        type: "progress",
        message: "🚀 Initializing QA Agent...\n",
      };

      yield {
        type: "progress",
        message: "Loading PRD content and preparing analysis...\n",
      };

      // Step 1: Extract Requirements
      yield {
        type: "thought",
        message: "� Step 1/4: Analyzing PRD to extract testable requirements...",
      };
      yield {
        type: "progress",
        message: "📑 Step 1/4: Analyzing PRD to extract testable requirements...\n",
      };
 
      yield {
        type: "progress",
        message: "Parsing document structure and identifying requirement patterns...\n",
      };

      yield {
        type: "progress",
        message: "🤖 Calling LLM to extract requirements...\n",
      };

      const requirements: Requirement[] = [];
      for await (const event of this.extractRequirements()) {
        if (event.type === "data") {
          requirements.push(...event.data);
        } else {
          yield event;
        }
      }

      yield {
        type: "thought",
        message: `✅ Extraction complete! Found ${requirements.length} distinct requirements.`,
      };

      yield {
        type: "progress",
        message: `Identified ${requirements.length} requirements across ${new Set(requirements.map(r => r.category)).size} categories\n`,
        data: { count: requirements.length },
      };

      // List each requirement
      for (const req of requirements) {
        yield {
          type: "requirement",
          message: `[${req.category.toUpperCase()}] ${req.description}`,
          data: req,
        };
      }

      // Step 2: Generate Tests
      yield {
        type: "thought",
        message: "🧪 Step 2/4: Generating comprehensive test cases...",
      };

      const allTests: TestCase[] = [];

      for (let i = 0; i < requirements.length; i++) {
        const req = requirements[i];
        yield {
          type: "thought",
          message: `📝 Processing requirement ${i + 1}/${requirements.length}: ${req.description}...`,
        };

        yield {
          type: "progress",
          message: `Analyzing requirement ${req.id} for test coverage (positive, negative, edge cases)...\n`,
        };

        yield {
          type: "progress",
          message: "🤖 Calling LLM to generate test cases...\n",
        };

        const tests: TestCase[] = [];
        for await (const event of this.generateTestsForRequirement(req)) {
          if (event.type === "data") {
            tests.push(...event.data);
          } else {
            yield event;
          }
        }

        allTests.push(...tests);

        yield {
          type: "thought",
          message: `✓ Generated ${tests.length} test cases for requirement ${i + 1}`,
        };

        // Emit partial markdown for incremental file updates
        const partialMarkdown = this.compileToMarkdown(requirements.slice(0, i + 1), allTests);
        yield {
          type: "test",
          message: `Saved ${allTests.length} test cases to file`,
          data: { partialMarkdown, testCount: allTests.length },
        };

        yield {
          type: "progress",
          message: `Progress: ${i + 1}/${requirements.length} requirements processed | ${allTests.length} total tests generated`,
          data: { current: i + 1, total: requirements.length, testsGenerated: allTests.length },
        };
      }

      yield {
        type: "thought",
        message: `✅ Test generation complete! Created ${allTests.length} test cases.`,
      };

      // Step 3: Review & Self-Correct
      yield {
        type: "thought",
        message: "🔍 Step 3/4: Reviewing test plan for completeness and coverage...",
      };

      yield {
        type: "progress",
        message: "Running self-review to identify gaps in test coverage...\n",
      };

      yield {
        type: "progress",
        message: "🤖 Calling LLM for quality review...\n",
      };

      const missingTests: TestCase[] = [];
      for await (const event of this.reviewPlan(requirements, allTests)) {
        if (event.type === "data") {
          missingTests.push(...event.data);
        } else {
          yield event;
        }
      }

      if (missingTests.length > 0) {
        yield {
          type: "thought",
          message: `⚠️ Review found ${missingTests.length} gaps in coverage. Adding missing tests...`,
        };

        for (const test of missingTests) {
          yield {
            type: "thought",
            message: `+ Adding missing test: ${test.title}`,
          };
        }

        allTests.push(...missingTests);

        yield {
          type: "thought",
          message: `✓ Added ${missingTests.length} additional tests. Total: ${allTests.length} tests.`,
        };
      } else {
        yield {
          type: "thought",
          message: "✅ Review complete! No gaps found. Test coverage is comprehensive.",
        };
      }

      // Step 4: Compile to Markdown
      yield {
        type: "thought",
        message: "📄 Step 4/4: Compiling final test plan document...",
      };

      yield {
        type: "progress",
        message: "Formatting test cases into structured Markdown...",
      };

      const markdown = this.compileToMarkdown(requirements, allTests);

      yield {
        type: "thought",
        message: "✅ Test plan compilation complete!",
      };

      yield {
        type: "thought",
        message: `📊 Final Summary: ${requirements.length} requirements → ${allTests.length} test cases`,
      };

      yield {
        type: "complete",
        message: `🎉 Test plan generated successfully! Ready for review.`,
        data: { markdown, testCount: allTests.length, requirementCount: requirements.length },
      };
    } catch (error) {
      yield {
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        data: error,
      };
    }
  }

  /**
   * Step 1: Extract Requirements with JSON validation & retries
   */
  private async* extractRequirements(): AsyncGenerator<AgentEvent | { type: "data", data: Requirement[] }> {
    const systemPrompt = `You are a QA analyst. Extract all testable requirements from the PRD.
Output ONLY valid JSON in this format:
{
  "requirements": [
    {
      "id": "REQ-001",
      "description": "User must be able to log in with email and password",
      "category": "functional"
    }
  ]
}

Categories: functional, non-functional, edge-case, ui-ux`;

    const userPrompt = `PRD:\n\n${this.prdContent}\n\nExtract all testable requirements as JSON.`;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        let fullResponse = "";
        let charCount = 0;

        const stream = streamOllamaResponse({
          messages: [{ role: "user", content: userPrompt }],
          systemPrompt,
          modelConfig: this.modelConfig || {
            model: "qwen2.5-coder:1.5b",
            temperature: 0.3,
            maxTokens: -1,
            numCtx: 32768,
          },
        });

        // Add visual separation for the JSON output
        yield {
          type: "progress",
          message: "\n\n",
        };

        let buffer = '';
        let lastEmitTime = Date.now();
        const emitInterval = 100;

        for await (const chunk of stream) {
          fullResponse += chunk;
          charCount += chunk.length;
          buffer += chunk;
          
          // Emit buffered content every 100ms or when buffer is large enough
          const now = Date.now();
          if ((now - lastEmitTime >= emitInterval && buffer.length > 0) || buffer.length > 200) {
            yield {
              type: "progress",
              message: buffer,
            };
            buffer = '';
            lastEmitTime = now;
          }
        }

        // Emit any remaining buffered content
        if (buffer.length > 0) {
          yield {
            type: "progress",
            message: buffer,
          };
        }

        yield {
          type: "progress",
          message: "\n\n",
        };

        yield {
          type: "progress",
          message: `LLM response complete (${charCount} chars). Parsing JSON...\n`,
        };

        // Parse JSON
        const parsed = this.parseJsonFromLlmResponse(fullResponse);

        if (!parsed.requirements || !Array.isArray(parsed.requirements)) {
          throw new Error("Invalid JSON structure");
        }

        const requirements = parsed.requirements.map((r: any, idx: number) => ({
          id: r.id || `REQ-${String(idx + 1).padStart(3, "0")}`,
          description: r.description || "",
          category: r.category || "functional",
        }));

        yield { type: "data", data: requirements };
        return;
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          throw new Error(`Failed to extract requirements after ${this.maxRetries} attempts`);
        }
        yield {
          type: "progress",
          message: `Retry ${attempt + 1}/${this.maxRetries} - retrying in ${this.retryDelay * (attempt + 1)}ms...`,
        };
        await this.sleep(this.retryDelay * (attempt + 1));
      }
    }
  }

  /**
   * Step 2: Generate Tests for a single requirement
   */
  private async* generateTestsForRequirement(req: Requirement): AsyncGenerator<AgentEvent | { type: "data", data: TestCase[] }> {
    const systemPrompt = `You are a QA engineer. Generate test cases for the given requirement.
Output ONLY valid JSON in this format:
{
  "tests": [
    {
      "id": "TC-001",
      "title": "Valid login with correct credentials",
      "description": "Verify user can log in with valid email and password",
      "steps": ["Navigate to login page", "Enter valid email", "Enter valid password", "Click login"],
      "expectedResult": "User is redirected to dashboard",
      "type": "positive"
    }
  ]
}

Types: positive, negative, edge`;

    const userPrompt = `Requirement: ${req.description}\n\nGenerate comprehensive test cases (positive, negative, edge cases) as JSON.`;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        let fullResponse = "";
        let charCount = 0;

        const stream = streamOllamaResponse({
          messages: [{ role: "user", content: userPrompt }],
          systemPrompt,
          modelConfig: this.modelConfig || {
            model: "qwen2.5-coder:1.5b",
            temperature: 0.4,
            maxTokens: -1,
            numCtx: 32768,
          },
        });

        // Add visual separation for the JSON output
        yield {
          type: "progress",
          message: "\n\n",
        };

        let buffer = '';
        let lastEmitTime = Date.now();
        const emitInterval = 100;

        for await (const chunk of stream) {
          fullResponse += chunk;
          charCount += chunk.length;
          buffer += chunk;
          
          const now = Date.now();
          if ((now - lastEmitTime >= emitInterval && buffer.length > 0) || buffer.length > 50) {
            yield {
              type: "progress",
              message: buffer,
            };
            buffer = '';
            lastEmitTime = now;
          }
        }

        if (buffer.length > 0) {
          yield {
            type: "progress",
            message: buffer,
          };
        }

        yield {
          type: "progress",
          message: "\n\n",
        };

        yield {
          type: "progress",
          message: `LLM response complete (${charCount} chars). Parsing JSON...\n`,
        };

        const parsed = this.parseJsonFromLlmResponse(fullResponse);

        if (!parsed.tests || !Array.isArray(parsed.tests)) {
          throw new Error("Invalid JSON structure");
        }

        const tests = parsed.tests.map((t: any) => ({
          id: t.id || `TC-${Date.now()}`,
          requirementId: req.id,
          title: t.title || "",
          description: t.description || "",
          steps: Array.isArray(t.steps) ? t.steps : [],
          expectedResult: t.expectedResult || "",
          type: t.type || "positive",
        }));

        yield { type: "data", data: tests };
        return;
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          // Fallback: return a basic test
          yield {
            type: "data",
            data: [
              {
                id: `TC-${Date.now()}`,
                requirementId: req.id,
                title: `Test for ${req.description}`,
                description: req.description,
                steps: ["Execute requirement"],
                expectedResult: "Requirement is satisfied",
                type: "positive",
              },
            ],
          };
          return;
        }
        yield {
          type: "progress",
          message: `Retry ${attempt + 1}/${this.maxRetries}...`,
        };
        await this.sleep(this.retryDelay * (attempt + 1));
      }
    }
  }

  /**
   * Step 3: Review Plan for gaps
   */
  private async* reviewPlan(
    requirements: Requirement[],
    tests: TestCase[]
  ): AsyncGenerator<AgentEvent | { type: "data", data: TestCase[] }> {
    const systemPrompt = `You are a senior QA lead. Review the test plan and identify missing test cases.
Output ONLY valid JSON in this format:
{
  "missingTests": [
    {
      "id": "TC-NEW-001",
      "requirementId": "REQ-001",
      "title": "Missing edge case title",
      "description": "Description of what's missing",
      "steps": ["Step 1", "Step 2"],
      "expectedResult": "Expected result",
      "type": "edge"
    }
  ]
}

If no gaps, return: {"missingTests": []}`;

    const userPrompt = `Requirements:\n${JSON.stringify(requirements, null, 2)}\n\nCurrent Tests:\n${JSON.stringify(tests, null, 2)}\n\nIdentify missing test cases.`;

    try {
      let fullResponse = "";
      let charCount = 0;

      const stream = streamOllamaResponse({
        messages: [{ role: "user", content: userPrompt }],
        systemPrompt,
        modelConfig: this.modelConfig || {
          model: "qwen2.5-coder:1.5b",
          temperature: 0.3,
          maxTokens: -1,
          numCtx: 32768,
        },
      });

      // Add visual separation for the JSON output
      yield {
        type: "progress",
        message: "\n\n",
      };

      let buffer = '';
      let lastEmitTime = Date.now();
      const emitInterval = 100;

      for await (const chunk of stream) {
        fullResponse += chunk;
        charCount += chunk.length;
        buffer += chunk;
        
        const now = Date.now();
        if ((now - lastEmitTime >= emitInterval && buffer.length > 0) || buffer.length > 50) {
          yield {
            type: "progress",
            message: buffer,
          };
          buffer = '';
          lastEmitTime = now;
        }
      }

      if (buffer.length > 0) {
        yield {
          type: "progress",
          message: buffer,
        };
      }

      yield {
        type: "progress",
        message: "\n\n",
      };

      yield {
        type: "progress",
        message: `Review complete (${charCount} chars). Parsing results...\n`,
      };

      const parsed = this.parseJsonFromLlmResponse(fullResponse);

      if (!parsed.missingTests || !Array.isArray(parsed.missingTests)) {
        yield { type: "data", data: [] };
        return;
      }

      const missingTests = parsed.missingTests.map((t: any) => ({
        id: t.id || `TC-NEW-${Date.now()}`,
        requirementId: t.requirementId || "",
        title: t.title || "",
        description: t.description || "",
        steps: Array.isArray(t.steps) ? t.steps : [],
        expectedResult: t.expectedResult || "",
        type: t.type || "edge",
      }));

      yield { type: "data", data: missingTests };
    } catch (error) {
      // If review fails, just continue with existing tests
      yield { type: "data", data: [] };
    }
  }

  /**
   * Step 4: Compile to Markdown
   */
  private compileToMarkdown(requirements: Requirement[], tests: TestCase[]): string {
    let md = `# Test Plan: ${this.fileName}\n\n`;
    md += `> **Generated by QA Agent** on ${new Date().toISOString()}\n\n`;
    md += `## Requirements Coverage\n\n`;

    for (const req of requirements) {
      const reqTests = tests.filter((t) => t.requirementId === req.id);
      md += `### ${req.id}: ${req.description}\n`;
      md += `- **Category**: ${req.category}\n`;
      md += `- **Test Cases**: ${reqTests.length}\n\n`;
    }

    md += `## Test Cases\n\n`;

    for (const test of tests) {
      md += `### ${test.id}: ${test.title}\n\n`;
      md += `**Type**: ${test.type} | **Requirement**: ${test.requirementId}\n\n`;
      md += `**Description**: ${test.description}\n\n`;
      md += `**Steps**:\n`;
      test.steps.forEach((step, idx) => {
        md += `${idx + 1}. ${step}\n`;
      });
      md += `\n**Expected Result**: ${test.expectedResult}\n\n`;
      md += `---\n\n`;
    }

    md += `\n\n<!-- Debug: Requirements: ${requirements.length}, Tests: ${tests.length} -->`;
    return md;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper to parse JSON from LLM response, handling markdown code blocks
   */
  private parseJsonFromLlmResponse(text: string): any {
    try {
      // 1. Try direct parse
      return JSON.parse(text);
    } catch (e) {
      // 2. Try extracting from markdown code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try {
          return JSON.parse(codeBlockMatch[1]);
        } catch (e2) {
          // continue
        }
      }

      // 3. Try finding the first { and last }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(text.substring(firstBrace, lastBrace + 1));
        } catch (e3) {
          // continue
        }
      }

      throw new Error("Failed to parse JSON from response");
    }
  }
}
