import type { FunctionConfig } from 'twenty-sdk';
import Twenty from '../../generated';

// Define the expected payload structure
type ProcessAppointmentParams = {
  name?: string;
  email?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
};

export const main = async (params: ProcessAppointmentParams) => {
  try {
    const client = new Twenty();

    const {
      name = 'Unknown',
      email,
      title = 'Meeting',
      startTime,
      endTime,
      location,
      description,
    } = params;

    // Log incoming request
    console.log('Processing appointment:', { name, email, title, startTime });

    if (!email) {
        throw new Error('Email is required to identify the person.');
    }

    // 1. Find or Create Person
    let personId: string;

    // Note: The generated client might differ in filtering syntax.
    // Assuming standard filter pattern. If 'people' query accepts filter.
    const existingPeople = await client.query({
        people: {
            __args: {
                filter: {
                    emails: {
                        primaryEmail: {
                            eq: email
                        }
                    }
                },
                first: 1
            },
            id: true,
            name: {
                firstName: true,
                lastName: true
            }
        }
    });

    if (existingPeople.people && existingPeople.people.length > 0) {
        // Person exists
        personId = existingPeople.people[0].id;
        console.log(`Found existing person: ${personId}`);
    } else {
        // Create new Person
        // Splitting name for simplicity
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const newPerson = await client.mutation({
            createPerson: {
                __args: {
                    data: {
                        name: {
                            firstName,
                            lastName
                        },
                        emails: {
                            primaryEmail: email
                        }
                    }
                },
                id: true
            }
        });

        personId = newPerson.createPerson.id;
        console.log(`Created new person: ${personId}`);
    }

    // 2. Create Calendar Event
    // We need to parse dates ensuring they are ISO-8601 strings
    // If not provided, default to now and now+1h for safety/testing
    const startAtDate = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
    const endAtDate = endTime ? new Date(endTime).toISOString() : new Date(Date.now() + 3600000).toISOString();

    const newEvent = await client.mutation({
        createCalendarEvent: {
            __args: {
                data: {
                    title: title,
                    startsAt: startAtDate,
                    endsAt: endAtDate,
                    isFullDay: false,
                    isCanceled: false,
                    location: location ?? '',
                    description: description ?? `Appointment booked via rcmtoolkit for ${email}`,
                    // Note: Direct participant creation might need a separate mutation
                    // or nested create depending on schema capabilities.
                    // For now, we just create the event.
                    // If we want to link the person, we usually use CalendarEventParticipant
                }
            },
            id: true,
            title: true
        }
    });

    const eventId = newEvent.createCalendarEvent.id;
    console.log(`Created calendar event: ${eventId}`);

    // 3. Link Person as Participant (Optional/Best Practice)
    // Checking if createCalendarEventParticipant is available in generated client
    // For now, let's assume we want to do it to complete the cycle.

    const newParticipant = await client.mutation({
        createCalendarEventParticipant: {
            __args: {
                data: {
                    calendarEventId: eventId,
                    personId: personId,
                    responseStatus: 'ACCEPTED', // Assuming they booked it, they accepted
                    isOrganizer: false
                }
            },
            id: true
        }
    });

    console.log(`Added participant: ${newParticipant.createCalendarEventParticipant.id}`);

    return {
        success: true,
        personId,
        eventId,
        participantId: newParticipant.createCalendarEventParticipant.id
    };

  } catch (error) {
    console.error('Error processing appointment:', error);
    // Return error object instead of throwing to be handled gracefully by the function runner if needed
    // or throw if we want 500
    throw error;
  }
};

export const config: FunctionConfig = {
  universalIdentifier: '8f7d2a5b-1c9e-4b3a-9d8e-7f6a5b4c3d2e',
  name: 'process-appointment',
  timeoutSeconds: 10,
  triggers: [
    {
      universalIdentifier: 'e1d2c3b4-a5f6-4e7d-8c9b-0a1b2c3d4e5f',
      type: 'route',
      path: '/appointment/process',
      httpMethod: 'GET', // Supporting GET for easy browser testing, could add POST
      isAuthRequired: false,
    },
    {
      universalIdentifier: 'f2e3d4c5-b6a7-4f8e-9d0a-1b2c3d4e5f6g',
      type: 'route',
      path: '/appointment/process',
      httpMethod: 'POST',
      isAuthRequired: false,
    }
  ],
};
