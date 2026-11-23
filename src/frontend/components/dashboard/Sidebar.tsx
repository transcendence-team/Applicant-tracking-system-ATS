"use client"
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const applicantMenu = [
	{label: "Browse jobs", href: "/dashboard"},
	{label: "My applications", href: "/dashboard/myapplications"},
	{label: "Profile", href: "/dashboard/profile"},
	{label: "Notifications", href: "/dashboard/notifications", count: 11},
	{label: "Messages", href: "/dashboard/messages", count: 7}
];

export default function Sidebar() {
	const router = useRouter();
	function HandleLogout() {
		document.cookie = "token=; path=/; max-age=0; SameSite=Lax; Secure";
		router.push("/login");
	}

	const path = usePathname();
	const isSettings = path.startsWith("/dashboard/settings")
	return (
	<aside className="w-48 text-white p-6 flex flex-col">
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
				</Link>
				)}
			))}
		</nav>
		<div className="mt-auto flex flex-col gap-4 pt-4">
			<Link className={`${isSettings ? "text-white" : "text-white/30"}`} href="/dashboard/settings">
			Settings</Link>
			<button className="text-white text-left cursor-pointer" onClick={HandleLogout} >Logout</button>
		</div>
	</aside>);
}