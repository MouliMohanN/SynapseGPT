# SynapseGPT Vector DB Migration Tutorial

This document tracks the migration of SynapseGPT's retrieval system from a simple in-memory solution to a scalable Vector Database architecture.

## Phase 1: Infrastructure Setup

### **1. What we did**
We set up the foundational tools required for vector search: a database to store vectors and an AI model to create them.

### **2. Why we did it**
- **Scalability**: The old system loaded all text into RAM and re-calculated indices on every request. This crashes with thousands of documents.
- **Semantic Search**: Vector databases allow searching by *meaning* (e.g., "dog" matches "puppy"), whereas the old system only matched exact keywords.
- **Persistence**: Data is saved to disk, so we don't need to re-process documents every time the server restarts.

### **3. How we did it**

#### Step 1: Install Dependencies
We installed the necessary libraries for our Next.js app.
```bash
npm install chromadb langchain @langchain/community @langchain/ollama
```
*Note: We used `--legacy-peer-deps` to resolve some version conflicts with LangChain.*

- **`chromadb`**: The client for our local vector database.
- **`langchain`**: A framework that simplifies working with LLMs and vector stores.
- **`@langchain/ollama`**: The specific adapter to talk to our local Ollama instance.

#### Step 2: Pull Embedding Model
We downloaded the AI model responsible for converting text into numbers (vectors).
```bash
ollama pull nomic-embed-text
```
- **`nomic-embed-text`**: A high-quality, open-source embedding model that runs fast on local hardware.

---

## Phase 2: Ingestion Pipeline (Coming Next)
We will write a script to read your markdown files, chunk them into small pieces, turn them into vectors, and store them in ChromaDB.

## Phase 3: Retrieval Integration (Planned)
We will update the chat API to query ChromaDB instead of the old in-memory index.
