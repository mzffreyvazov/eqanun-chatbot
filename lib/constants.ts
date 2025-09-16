import { generateDummyPassword } from './db/utils';

export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

// RAG Backend Configuration
export const RAG_BACKEND_URL = 
  process.env.RAG_BACKEND_URL || 
  (isProductionEnvironment 
    ? process.env.RAG_BACKEND_URL_PRODUCTION || 'http://localhost:8000' 
    : 'http://localhost:8000');
