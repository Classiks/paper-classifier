import { ModeToggle } from "@/components/theme-toggle";
import { Badge } from "../ui/badge";

export default function HeaderBar() {
    return (
        <div className="flex justify-between items-center p-4 h-12 bg-muted sticky top-0 z-10 rounded-b-lg shadow-md">
            <div></div>
            <div className="flex items-center gap-2 animate-slidein">
                <h1 className="text-lg font-bold bg-gradient-to-br from-highlight-accent to-highlight-accent-foreground text-transparent bg-clip-text">Paper Categorizer</h1>
                <Badge variant="outline" className="bg-highlight-accent text-highlight-accent-foreground">
                    v0.1
                </Badge>
            </div>
            <ModeToggle />
        </div>
    )
}