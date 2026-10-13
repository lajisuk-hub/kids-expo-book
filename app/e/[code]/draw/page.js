import Loader from "../../../components/Loader";
export default async function Page({ params }) { const { code } = await params; return <Loader code={String(code).toLowerCase()} view="draw" />; }
