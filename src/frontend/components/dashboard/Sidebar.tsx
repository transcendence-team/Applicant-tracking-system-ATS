"use client"
import Link from "next/link";

const applicantMenu = [
	{label: "Browse jobs", href: "/dashboard"},
	{label: "My applications", href: "/dashboard/myapplications"},
	{label: "Profile", href: "/dashboard/profile"}
];

export default function Sidebar() {
	return (
	<aside className="w-60 text-white p-6">
		<nav className="flex flex-col gap-4">
			{applicantMenu.map((item) => (
				<Link key={item.href} href={item.href}>{item.label}</Link>
			))}
		</nav>
	</aside>);
}