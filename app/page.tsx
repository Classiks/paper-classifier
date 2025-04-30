"use client";

import { CategoryResult } from "@/components/CategoryResult";
import { ExcelExporter } from "@/components/ExcelExporter";
import { ExcelUploader } from "@/components/ExcelUploader";
import { PaperForm } from "@/components/PaperForm";
import { Settings } from "@/components/Settings";
import { Button } from "@/components/ui/button";
import { usePaperStore } from "@/lib/store";
import { Trash2 } from "lucide-react";

export default function Home() {
	const { papers, clearAllCodings } = usePaperStore();
	const hasCodings = papers.some(paper => paper.coding);

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			<h1 className="text-2xl font-bold mb-6">Paper Classifier</h1>
			
			<Settings />
			
			<div className="mb-8">
				<h2 className="text-xl font-semibold mb-4">Add Papers</h2>
				<div className="grid grid-cols-2 gap-4 mb-4">
					<ExcelUploader />
					<ExcelExporter />
				</div>
				<PaperForm />
			</div>
			
			{hasCodings && (
				<div>
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold">Analysis Results</h2>
						<Button 
							variant="outline" 
							size="sm"
							onClick={() => {
								if (confirm("Are you sure you want to clear all analysis results?")) {
									clearAllCodings();
								}
							}}
							className="flex items-center gap-1 text-red-500 hover:text-red-600"
						>
							<Trash2 className="h-4 w-4" />
							Clear All Results
						</Button>
					</div>
					<div className="space-y-6">
						{papers.map((paper) => 
							paper.coding && (
								<CategoryResult key={paper.id} paper={paper} />
							)
						)}
					</div>
				</div>
			)}
		</div>
	);
}