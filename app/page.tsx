import MainPageClient from "./components/main-page-client";

type Props = {
  searchParams: Promise<{
    report?: string;
  }>;
};

export default async function Home({ searchParams }: Props) {
  const report = (await searchParams).report;
  return (
    <div className=" min-h-screen flex justify-center items-center">
      <MainPageClient reportId={report} />
    </div>
  );
}
