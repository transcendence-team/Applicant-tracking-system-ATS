import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({children}: {children: React.ReactNode})
{
	return (
	<div className="flex h-screen">
		<Sidebar/>
		<div className="flex flex-col flex-1 bg-[#ff00ff] min-w-0 min-h-0">
			<Topbar/>
			<main className="flex-1 overflow-y-auto p-6">{children}</main>
		</div>
	</div>);
}