import { PreSatori } from "@/utils/pre-satori";
interface WikipediaArticleProps {
	title?: string;
	extract?: string;
	url?: string;
	thumbnail?: {
		source?: string;
		width?: number;
		height?: number;
	};
	categories?: string[];
	links?: string[];
	lastModified?: string;
	pageId?: number;
}

export default function Wikipedia({
	title = "Loading article...",
	extract = "Article content is loading or unavailable.",
	thumbnail = {
		source: "",
		width: 0,
		height: 0,
	},
}: WikipediaArticleProps) {
	// Ensure we have valid data to display
	const hasValidThumbnail = thumbnail?.source
		? thumbnail.source.startsWith("https://") &&
			thumbnail.width &&
			thumbnail.height
		: false;

	// Calculate a more appropriate extract length based on content length
	// This helps prevent overflow while maintaining readability
	const calculateExtractLength = () => {
		if (!extract) return "";

		// Base length for truncation - adjusted based on thumbnail presence
		const baseLength = hasValidThumbnail ? 650 : 800;

		if (extract.length <= baseLength) return extract;

		// Find the last period within the limit to truncate at a natural break
		const lastPeriodIndex = extract.lastIndexOf(".", baseLength);
		if (lastPeriodIndex > baseLength * 0.8) {
			return `${extract.substring(0, lastPeriodIndex + 1)}`;
		}

		return `${extract.substring(0, baseLength)}...`;
	};

	const truncatedExtract = calculateExtractLength();

	// Format the last modified date if available
	const formattedDate = new Date().toLocaleDateString("en-GB", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});

	return (
		<PreSatori useDoubling={true}>
			{(transform) => (
				<>
					{transform(
						<div className="flex flex-col w-[800px] h-[480px]">
							<div className="flex-none p-4 border-b border-black">
								<h1 className="text-5xl">
									{title || "Wikipedia Article"}
								</h1>
							</div>
							<div className="flex-1 p-4 flex flex-row">
								<p className="text-2xl flex-grow tracking-tight leading-none"
								>
									{truncatedExtract}
								</p>
								{hasValidThumbnail && (
									<div className="pr-4 w-[240px]">
										<picture>
											{/* YOU CANNOT USE NEXTJS IMAGE COMPONENT HERE, BECAUSE SATORI DOES NOT SUPPORT IT */}
											<source srcSet={thumbnail.source} type="image/webp" />
											<img
												src={thumbnail.source}
												alt={title}
												width={thumbnail.width}
												height={thumbnail.height}
												style={{
													width: "240px",
													height:
														thumbnail.height && thumbnail.width
															? `${Math.round(
																	thumbnail.height * (240 / thumbnail.width),
																)}px`
															: "auto",
													maxWidth: "240px",
													maxHeight: "280px",
													objectFit: "contain",
												}}
											/>
										</picture>
									</div>
								)}
							</div>
							<div className="flex-none p-4">
								<div className="text-2xl text-black flex justify-between w-full p-2 rounded-xl dither-100" style={{ WebkitTextStroke: "4px white" }}>
									<span>Wikipedia • Random Article</span>
									{formattedDate && <span>Generated: {formattedDate}</span>}
								</div>
							</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
