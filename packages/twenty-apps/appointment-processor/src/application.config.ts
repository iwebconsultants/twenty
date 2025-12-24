import { type ApplicationConfig } from 'twenty-sdk';

const config: ApplicationConfig = {
  universalIdentifier: '68518e93-61b6-4ac3-9828-868787031305',
  displayName: 'Appointment Processor',
  description: 'Proceses appointments from Webhooks',
  icon: 'IconCalendar',
  applicationVariables: {},
  // Using a generated UUID for the function role, ensuring it doesn't conflict
  functionRoleUniversalIdentifier: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
};

export default config;
