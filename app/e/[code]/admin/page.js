import Admin from "../../../components/Admin";
export default async function Page({ params }) { const { code } = await params; return <Admin code={String(code).toLowerCase()} />; }
