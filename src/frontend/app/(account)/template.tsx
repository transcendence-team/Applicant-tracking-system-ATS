

export default function AccountTemplate({children}: {children:React.ReactNode})
{
	return (
		<div className="w-full flex justify-center animate-fade-in">
			{children}
		</div>
	);
}