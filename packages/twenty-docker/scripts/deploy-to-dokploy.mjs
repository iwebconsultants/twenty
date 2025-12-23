import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DOKPLOY_HOST = process.env.DOKPLOY_HOST || 'https://server.iwebx.com.au';
const DOKPLOY_API_TOKEN = process.env.DOKPLOY_API_TOKEN;

if (!DOKPLOY_API_TOKEN) {
  console.error('Error: DOKPLOY_API_TOKEN environment variable is required.');
  process.exit(1);
}

const API_URL = `${DOKPLOY_HOST}/api`;
const PROJECT_NAME = 'Business';
const SERVICE_NAME = 'twenty-crm';
const COMPOSE_FILE_PATH = path.join(__dirname, '../docker-compose.yml');

async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'X-API-KEY': DOKPLOY_API_TOKEN,
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

async function getOrCreateProject(name) {
  console.log(`Checking for project '${name}'...`);
  const projects = await apiRequest('/project.all');
  let project = projects.find(p => p.name === name);

  if (project) {
    console.log(`Project '${name}' found (ID: ${project.projectId}).`);
    return project;
  } else {
    console.log(`Project '${name}' not found. Creating...`);
    project = await apiRequest('/project.create', 'POST', { name });
    console.log(`Project '${name}' created (ID: ${project.projectId}).`);
    return project;
  }
}

async function getEnvContent() {
    try {
        const envPath = path.join(__dirname, '../.env.example');
        const content = await fs.readFile(envPath, 'utf-8');
        return content;
    } catch (e) {
        console.warn('Could not read .env.example, using empty env.');
        return '';
    }
}

async function getOrCreateService(project, name) {
  console.log(`Preparing to deploy service '${name}'...`);

  // Use compose list from project object directly
  const existingService = project.compose?.find(s => s.name === name);

  if (existingService) {
      console.log(`Service '${name}' already exists (ID: ${existingService.composeId}).`);
      console.log('Service already exists. Please use the Dokploy UI to redeploy if needed.');
      return existingService;
  }

  const composeFileContent = await fs.readFile(COMPOSE_FILE_PATH, 'utf-8');
  const projectId = project.projectId;

  if (!project.environments || project.environments.length === 0) {
      throw new Error('Project has no environments. Please create one in Dokploy UI.');
  }
  // Use first environment (usually Production/one default)
  const environmentId = project.environments[0].environmentId || project.environments[0].id;
  console.log(`Using Environment ID: ${environmentId}`);

  const payload = {
    name: name,
    projectId: projectId,
    environmentId: environmentId,
    composeType: 'docker-compose',
    composeFile: composeFileContent,
    repositoryUrl: 'https://github.com/iwebconsultants/twenty.git',
    branch: 'main',
    composePath: './packages/twenty-docker/docker-compose.yml',
    env: await getEnvContent()
  };

  console.log(`Creating service '${name}'...`);
  const newService = await apiRequest('/compose.create', 'POST', payload);
  console.log(`Service '${name}' created (ID: ${newService.composeId}).`);

  try {
      console.log('Triggering initial deployment...');
      // Assuming compose.deploy endpoint uses composeId
      await apiRequest(`/compose.deploy/${newService.composeId}`, 'POST');
      console.log('Deployment triggered successfully.');
  } catch (e) {
      // If simple deploy fails, maybe it needs arguments? Or separate endpoint.
      console.log('Could not trigger auto-deployment. Please deploy manually in UI. Error:', e.message);
  }

  return newService;
}

async function main() {
  try {
    const project = await getOrCreateProject(PROJECT_NAME);
    if (!project || !project.projectId) {
        throw new Error('Project creation failed or returned invalid data');
    }
    await getOrCreateService(project, SERVICE_NAME);
    console.log('Deployment setup complete!');
  } catch (error) {
    console.error('Deployment script failed:', error.message);
    process.exit(1);
  }
}

main();
