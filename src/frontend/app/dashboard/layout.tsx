import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({children}: {children: React.ReactNode})
{
	return (
	<div className="flex h-screen bg-[#1A1A1A]">
		<Sidebar/>
		<div className="flex-1 min-w-0 min-h-0 pt-6 pr-6">
			<div className="h-full flex flex-col bg-white rounded-t-[30px] overflow-hidden">
				<Topbar/>
				<main className="flex-1 overflow-y-auto p-6">{children}</main>
			</div>
		</div>
	</div>);
}