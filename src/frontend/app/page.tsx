import {redirect} from "next/navigation";

export default function Home() {
	redirect("/login");
}

// import Login from "./(account)/login/page";

// export default function Home() {
// 	return (<Login/>);
// }