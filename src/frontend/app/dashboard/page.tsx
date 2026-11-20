"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {

	const router = useRouter();
	function HandleLogout() {
		document.cookie = "token=; path=/; max-age=0; SameSite=Lax; Secure";
		router.push("/login");
	}

	return (
		<div className="min-h-screen relative flex items-center justify-center">
			<button className="w-1/4 h-14 rounded-[20px] bg-[#1A1A1A] text-white font-semibold text-xl cursor-pointer hover:bg-black"
					onClick={HandleLogout}>Logout</button>
		</div>);
}