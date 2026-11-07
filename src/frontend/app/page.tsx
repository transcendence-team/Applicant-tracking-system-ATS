import Link from "next/link";

export default function Login() {
	return (
		<div className="min-h-screen flex p-5">
			<div className="flex-1 rounded-[30px] bg-[#D9D9D9] hidden lg:block"></div>
			<div className="flex-1 flex items-center justify-center px-6">
				<div className="w-full max-w-[540px]">
					<form className="flex flex-col gap-6">
						<h1 className="text-4xl text-center font-bold">Welcome Back!</h1>
						<input className="w-full h-14 rounded-[20px] bg-[#F2F2F2] px-6"
							placeholder="Email" type="email"/>
						<input className="w-full h-14 rounded-[20px] bg-[#F2F2F2] px-6"
							placeholder="Password" type="password"/>
						<Link className="text-right text-sm" href="/forgot-password">Forget Password?</Link>
						<button className="w-full h-14 rounded-[20px] bg-[#1A1A1A] text-white font-semibold text-xl cursor-pointer hover:bg-black"
							type="submit">Login</button>
					</form>
					<p className="text-center mt-6">You don't have an account yet?{" "}
					<Link href="/register" className="font-bold">Register</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
