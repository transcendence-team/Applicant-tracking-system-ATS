import type { Metadata } from "next";
import "./globals.css";
import {Poppins} from "next/font/google";

const poppins = Poppins({
	variable: "--font-poppins",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "ATS | Transcendence",
	description: "Application Tracking System Platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${poppins.variable} h-full antialiased`}>
			<body className="min-h-full flex flex-col">
				{children}
			</body>
		</html>
	);
}
