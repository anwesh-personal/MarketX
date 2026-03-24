import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

// Use service role to bypass RLS
function createClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2';

/**
 * Railway service info returned to the frontend
 */
interface RailwayService {
    id: string;
    name: string;
    projectId: string;
    projectName: string;
    environmentId: string;
    environmentName: string;
    domains: string[];
}

/**
 * GET - Fetch Railway services by querying user's projects directly
 * Simplified approach: Skip workspace concept, just get all user's projects
 */
export async function GET(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const supabase = createClient();

        const { data: config, error: configError } = await supabase
            .from('worker_deployment_config')
            .select('railway_token')
            .single();

        if (configError || !config?.railway_token) {
            return NextResponse.json(
                { error: 'Railway token not configured.' },
                { status: 400 }
            );
        }

        const services: RailwayService[] = [];
        const token = config.railway_token.trim();

        // Query user's projects directly via 'me' query
        const projectsQuery = `
            query {
                me {
                    projects(first: 50) {
                        edges {
                            node {
                                id
                                name
                                environments {
                                    edges {
                                        node {
                                            id
                                            name
                                        }
                                    }
                                }
                                services {
                                    edges {
                                        node {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const projectsResponse = await fetch(RAILWAY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: projectsQuery }),
        });

        if (!projectsResponse.ok) {
            const errorText = await projectsResponse.text();
            console.error('Railway API error:', errorText);
            return NextResponse.json(
                { error: `Railway API error: ${projectsResponse.status}` },
                { status: 500 }
            );
        }

        const projectsData = await projectsResponse.json();

        if (projectsData.errors) {
            console.error('Railway GraphQL errors:', projectsData.errors);
            return NextResponse.json(
                { error: projectsData.errors[0]?.message || 'Railway API error' },
                { status: 500 }
            );
        }

        // Extract projects
        const projectEdges = projectsData.data?.me?.projects?.edges || [];

        // Step 2: For each project, get domains for each service in each environment
        for (const projectEdge of projectEdges) {
            const project = projectEdge.node;
            const environments = project.environments?.edges || [];
            const projectServices = project.services?.edges || [];

            for (const envEdge of environments) {
                const env = envEdge.node;

                for (const serviceEdge of projectServices) {
                    const service = serviceEdge.node;

                    // Get domains for this service in this environment
                    const domainsQuery = `
                        query {
                            domains(
                                projectId: "${project.id}",
                                environmentId: "${env.id}",
                                serviceId: "${service.id}"
                            ) {
                                serviceDomains {
                                    domain
                                }
                                customDomains {
                                    domain
                                }
                            }
                        }
                    `;

                    try {
                        const domainsResponse = await fetch(RAILWAY_API_URL, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ query: domainsQuery }),
                        });

                        if (domainsResponse.ok) {
                            const domainsData = await domainsResponse.json();
                            const serviceDomains = domainsData.data?.domains?.serviceDomains || [];
                            const customDomains = domainsData.data?.domains?.customDomains || [];

                            const allDomains = [
                                ...serviceDomains.map((d: any) => d.domain),
                                ...customDomains.map((d: any) => d.domain),
                            ];

                            // Only include services that have at least one domain
                            if (allDomains.length > 0) {
                                services.push({
                                    id: service.id,
                                    name: service.name,
                                    projectId: project.id,
                                    projectName: project.name,
                                    environmentId: env.id,
                                    environmentName: env.name,
                                    domains: allDomains,
                                });
                            }
                        }
                    } catch (domainError) {
                        console.error(`Error fetching domains for service ${service.id}:`, domainError);
                        // Continue to next service
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            services,
            serviceCount: services.length,
        });

    } catch (error: any) {
        console.error('Railway services fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch Railway services' },
            { status: 500 }
        );
    }
}
