import { getCommunityFromHeaders } from "@/services/config";
import { headers } from "next/headers";
import AgentWalletPolicies from "@/containers/agent-wallet/policies";

interface PageProps {
  params: Promise<{
    account: string;
  }>;
}

export default async function Page(props: PageProps) {
  const headersList = await headers();
  const config = await getCommunityFromHeaders(headersList);
  if (!config) {
    return <div>Community not found</div>;
  }

  const { account } = await props.params;

  return <AgentWalletPolicies config={config} accountAddress={account} />;
}
