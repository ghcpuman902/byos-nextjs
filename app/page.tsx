import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { getHostUrl } from "@/utils/helpers";
import { DbInitializer } from "@/components/dashboard/db-initializer";
import type { Device, SystemLog } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";

export default async function Dashboard() {
	const { supabase, dbStatus } = await createClient();
	const hostUrl = getHostUrl();

	// Fetch devices & logs only if DB ready
	let devices: Device[] = [];
	let systemLogs: SystemLog[] = [];

	if (dbStatus.ready && supabase) {
		const [devicesResult, logsResult] = await Promise.all([
			supabase.from("devices").select("*"),
			supabase
				.from("system_logs")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(50),
		]);

		devices = devicesResult.data || [];
		systemLogs = logsResult.data || [];
	}

	return (
		<>
			<div className="mb-6">
				<h2 className="mt-10 scroll-m-20 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0 flex items-center">
					Good{" "}
					{new Date().getHours() < 12
						? "morning ☀️"
						: new Date().getHours() < 18
							? "afternoon ☕️"
							: "evening 🌙"}
					{!dbStatus.ready && (
						<Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
							noDB mode
						</Badge>
					)}
				</h2>
				<p className="text-muted-foreground">
					Next.js app running on{" "}
					<a href={hostUrl} className="underline">
						{hostUrl}
					</a>{" "}
					in {process.env.NODE_ENV} mode
				</p>
			</div>

			{!dbStatus.ready && (
				<>
					<div className="mt-4 rounded-lg p-4 border border-muted shadow">
						{dbStatus.error === "SUPABASE_API_ENV_VARS_MISSING" && (
							<div className="p-4">
								<h3 className="font-bold text-2xl mb-2">
									🤔
									<span className="bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
										{" "}
										Hmm, we are missing something...
									</span>
								</h3>
								<p className="mb-3">
									We&apos;re missing the{" "}
									<span className="font-mono bg-muted px-1 rounded">
										NEXT_PUBLIC_SUPABASE_URL
									</span>{" "}
									and{" "}
									<span className="font-mono bg-muted px-1 rounded">
										NEXT_PUBLIC_SUPABASE_ANON_KEY
									</span>{" "}
									in your environment variables (/.env file).
								</p>

								<div className="mt-4 space-y-3">
									<p className="font-medium">Here&apos;s how to fix this:</p>

									<div className="ml-2 pl-3 border-l-2 border-muted-foreground">
										<p className="mb-1">
											<span className="font-semibold">Option 1:</span> Check
											your Vercel integration
										</p>
										<p className="text-sm text-muted-foreground mb-2">
											Go to your{" "}
											<a
												href="https://app.supabase.com/project/_/settings/integrations"
												className="text-blue-600 hover:underline"
											>
												Supabase Dashboard Integrations
											</a>{" "}
											to verify your Vercel connection, remember to toggle on
											&ldquo;Development&ldquo;, then
											&ldquo;Manage&ldquo;/&ldquo;Resync enviroment
											variables&ldquo;; finally from your local development
											environment, run{" "}
											<span className="font-mono bg-muted px-1 rounded">
												vercel link
											</span>{" "}
											and{" "}
											<span className="font-mono bg-muted px-1 rounded">
												vercel env pull
											</span>
											.
										</p>
									</div>

									<div className="ml-2 pl-3 border-l-2 border-muted-foreground">
										<p className="mb-1">
											<span className="font-semibold">Option 2:</span> Add them
											manually
										</p>
										<p className="text-sm text-muted-foreground mb-2">
											Get your API credentials directly from the{" "}
											<a
												href="https://app.supabase.com/project/_/settings/api?showConnect=true"
												className="text-blue-600 hover:underline"
											>
												Supabase API Settings
											</a>{" "}
											page, under &ldquo;App Frameworks&ldquo;, save to your
											.env file. Then, don&apos;t forget to run the database
											initialization SQL script shown below using the{" "}
											<a
												href="https://app.supabase.com/project/_/sql/new"
												className="text-blue-600 hover:underline"
											>
												SQL Editor
											</a>{" "}
											in your Supabase dashboard.
										</p>
									</div>
								</div>
							</div>
						)}
						<DbInitializer connectionUrl={dbStatus.PostgresUrl} />
					</div>
					<DashboardSkeleton className="filter blur-[1px] pointer-events-none mt-6" />
				</>
			)}

			{dbStatus.ready && (
				<DashboardContent
					devicesPromise={Promise.resolve(devices)}
					systemLogsPromise={Promise.resolve(systemLogs)}
					hostUrl={hostUrl}
				/>
			)}
		</>
	);
}
