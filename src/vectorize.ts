// Standalone script to vectorize movie data
import { vectorizeData } from './utils/vectorize.js';

// Run vectorization when this script is executed directly
vectorizeData().catch(console.error);
