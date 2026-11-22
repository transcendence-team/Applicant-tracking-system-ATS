"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";

const applicantMenu = [
	{label: "Browse jobs", href: "/dashboard"},
	{label: "My applications", href: "/dashboard/myapplications"},
	{label: "Profile", href: "/dashboard/profile"},
	{label: "Notifications", href: "/dashboard/notifications", count: 11},
	{label: "Messages", href: "/dashboard/messages", count: 7}
];

export default function Sidebar() {
	const path = usePathname();

	return (
	<aside className="w-48 text-white p-6">
		<nav className="flex flex-col gap-4 w-fit mt-30">
			{applicantMenu.map(((item) => {
			const isActive = item.href === "/dashboard" ? path === "/dashboard" : path.startsWith(item.href);
			return (
				<Link className={`flex items-center gap-2
					${isActive ? "text-white" : "text-white/30"}`}
				key={item.href} href={item.href}>{item.label}
				{(item.count ?? 0) > 0 &&
				(<span className="min-w-5 h-5 px-1 rounded-full bg-background text-foreground text-xs font-bold flex items-center justify-center">
					{item.count! > 9 ? "+9" : item.count}
				</span>)}
				</Link>)}
			))}
		</nav>
	</aside>);
}