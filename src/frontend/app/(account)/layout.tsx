"use client";
import { usePathname } from "next/navigation";

export default function AccountLayout({children}: {children: React.ReactNode})
{
	const isRegister = usePathname() === "/register";
	return (
		<div className={`min-h-screen relative flex
		${isRegister ? "justify-start" : "justify-end"}`}>
			<div className={`z-10 absolute top-5 bottom-5 left-5 w-[calc(50%-1.25rem)] transition-transform duration-500 rounded-[30px] bg-[#1A1A1A] hidden lg:block
			${isRegister ? "translate-x-full" : ""}`}></div>
			<div className="w-full lg:w-1/2 flex items-center justify-center px-6">{children}</div>
		</div>
	);
}
