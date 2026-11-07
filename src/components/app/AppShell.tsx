import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function workspaceCommand(command: string) { window.dispatchEvent(new CustomEvent("checker-command", { detail: command })); }
export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);
  return <div className="checker-app">
    <header className="checker-menu no-print">
      <Link to="/" className="checker-brand">PROVENAI</Link>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost">File</Button></DropdownMenuTrigger><DropdownMenuContent>
        <DropdownMenuItem asChild><Link to="/" onClick={() => workspaceCommand('load')}>Load drawing</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/inspections/new">New inspection</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/history">Inspection history</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost">View</Button></DropdownMenuTrigger><DropdownMenuContent>
        {([['fit','Fit drawing'],['missing','Required measurements'],['measurements','Measured properties'],['changes','Revision comparison']] as const).map(([command,label]) => <DropdownMenuItem key={command} onClick={() => workspaceCommand(command)}>{label}</DropdownMenuItem>)}
      </DropdownMenuContent></DropdownMenu>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost">Check</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => workspaceCommand('run')}>Run check</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      <Button variant="ghost" asChild><Link to="/rules">Rules</Link></Button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost">Report</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem asChild><Link to="/report">Daily report</Link></DropdownMenuItem><DropdownMenuItem onClick={() => workspaceCommand('json')}>Export JSON</DropdownMenuItem><DropdownMenuItem onClick={() => window.print()}>Print / Save PDF</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </header>
    <main>{children}</main>
  </div>;
}
export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return <header className="document-header"><div><h1>{title}</h1>{sub && <p className="text-sm">{sub}</p>}</div>{actions && <div className="flex items-center gap-2 no-print">{actions}</div>}</header>;
}
