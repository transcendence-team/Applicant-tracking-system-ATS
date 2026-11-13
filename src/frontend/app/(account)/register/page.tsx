"use client";
import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();

	async function HandleSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/auth/register",
				{ method: "POST", headers: {"Content-Type": "application/json"},
				body: JSON.stringify({email, password}), });

			if (!res.ok) {
				const data = await res.json();
				setError(data?.message ?? "Register failed");
				setLoading(false);
				return; }

			router.push("/login");

		} catch {
			setError("Something went wrong. Please try again.");
			setLoading(false);
		}
	}

	return (
		<div>
			<form className="flex flex-col gap-6" onSubmit={HandleSubmit}>
				<h1 className="text-4xl text-center font-bold">Create Your Account!</h1>
				<input className="w-full h-14 rounded-[20px] bg-[#EEEEEE] px-6"
					placeholder="Email" type="email"
					value={email} onChange={(e) => setEmail(e.target.value)}/>
				<input className="w-full h-14 rounded-[20px] bg-[#EEEEEE] px-6"
					placeholder="Password" type="password" autoComplete="new-password"
					value={password} onChange={(e) => setPassword(e.target.value)}/>
				<button className="w-full h-14 rounded-[20px] bg-[#1A1A1A] text-white font-semibold text-xl cursor-pointer hover:bg-black"
					type="submit" disabled={loading}>Register</button>
				{error && <p className="text-red-600 text-center">{error}</p>}
			</form>
			<p className="text-center mt-6">Already have an account?{" "}
			<Link href="/login" className="font-bold">Login</Link>
			</p>
		</div>
	);
}

// export default function Register() {

// 	const [email, setEmail] = useState("");
// 	const [password, setPassword] = useState("");

// 	const router = useRouter();
// 	const [error, setError] = useState("");
// 	const [loading, setLoading] = useState(false);

// 	async function HandleSubmit(e: SubmitEvent<HTMLFormElement>) {
// 		e.preventDefault();
// 		setLoading(true);
// 		setError("");

// 		try {
// 			const res = await fetch("/api/account/login",
// 				{ method: "POST", headers: {"Content-Type": "application/json"},
// 				body: JSON.stringify({email, password}), });

// 			if (!res.ok) {
// 				const data = await res.json();
// 				setError(data?.message ?? "Login failed");
// 				setLoading(false);
// 				return; }

// 			router.push("/login");

// 		} catch {
// 			setError("Something went wrong. Please try again.");
// 			setLoading(false);
// 		}
// 	}

// 	return (
// 		<div className="min-h-screen flex p-5">
// 			<div className="flex-1 rounded-[30px] bg-[#D9D9D9] hidden lg:block"></div>
// 			<div className="flex-1 flex items-center justify-center px-6">
// 				<div className="w-full max-w-[540px]">
// 					<form className="flex flex-col gap-6" onSubmit={HandleSubmit}>
// 						<h1 className="text-4xl text-center font-bold">Welcome Back!</h1>
// 						<input className="w-full h-14 rounded-[20px] bg-[#F2F2F2] px-6"
// 							placeholder="Email" type="email"
// 							value={email} onChange={(e) => setEmail(e.target.value)}/>
// 						<input className="w-full h-14 rounded-[20px] bg-[#F2F2F2] px-6"
// 							placeholder="Password" type="password"
// 							value={password} onChange={(e) => setPassword(e.target.value)}/>
// 						<Link className="text-right text-sm" href="/forgot-password">Forget Password?</Link>
// 						<button className="w-full h-14 rounded-[20px] bg-[#1A1A1A] text-white font-semibold text-xl cursor-pointer hover:bg-black"
// 							type="submit" disabled={loading}>Login</button>
// 						{error && <p className="text-red-600 text-center">{error}</p>}
// 					</form>
// 					<p className="text-center mt-6">You don't have an account yet?{" "}
// 					<Link href="/register" className="font-bold">Register</Link>
// 					</p>
// 				</div>
// 			</div>
// 		</div>
// 	);
// }
