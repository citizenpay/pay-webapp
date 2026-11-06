"use client";

import TxCard from "@/components/tx-card";
import { Skeleton } from "@/components/ui/skeleton";
import Card from "@/components/wallet/card";
import { ColorMappingOverrides } from "@/components/wallet/colorMappingOverrides";
import { useIsScrolled } from "@/hooks/scroll";
import { useThemeUpdater } from "@/hooks/theme";
import { useFocusEffect } from "@/hooks/useFocusEffect";
import { useScrollableWindowFetcher } from "@/hooks/useScrollableWindow";
import { cn } from "@/lib/utils";
import { ATransaction } from "@/services/pay/transactions";
import { useAccount } from "@/state/account/actions";
import { useOrders } from "@/state/orders/actions";
import { useProfiles } from "@/state/profiles/actions";
import { useTransactions } from "@/state/transactions/actions";
import { getColors } from "@/utils/colors";
import { getBaseUrl } from "@/utils/deeplink";
import { CommunityConfig, Config, Profile } from "@citizenwallet/sdk";
import { Flex, Text } from "@radix-ui/themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/lib/use-translation";
interface ContainerProps {
  config: Config;
  accountAddress: string;
  initialTransactions: ATransaction[];
  serialNumber?: string;
  project?: string;
  initialCardColor: string;
  tokenAddress?: string;
  initialProfile?: Profile;
  initialBalance?: string;
  hideTopUp?: boolean;
}

export default function ReadOnly({
  config,
  accountAddress,
  initialTransactions = [],
  serialNumber,
  project,
  initialCardColor,
  tokenAddress,
  initialProfile,
  initialBalance,
  hideTopUp,
}: ContainerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(initialTransactions.length === 0);
  const [cardColor, setCardColor] = useState(initialCardColor);

  const { community } = config;

  const communityConfig = useMemo(() => new CommunityConfig(config), [config]);

  const token = useMemo(
    () => communityConfig.getToken(tokenAddress),
    [communityConfig, tokenAddress]
  );

  const topUpPlugin = useMemo(() => {
    return communityConfig.getActionPlugin(
      "topup",
      token.address,
      token.chain_id
    );
  }, [communityConfig, token.address, token.chain_id]);

  const isScrolled = useIsScrolled();

  const baseUrl = getBaseUrl();

  const [state, actions] = useAccount(baseUrl, config, accountAddress);
  const [profilesState, profilesActions] = useProfiles(config);
  const [ordersState, ordersActions] = useOrders(baseUrl);
  const [transactionsState, transactionsActions] = useTransactions(
    baseUrl,
    initialTransactions
  );

  useThemeUpdater(community, cardColor);

  const transactions = transactionsState((state) => state.transactions);
  const loadingTransactions = transactionsState((state) => state.loading);

  useEffect(() => {
    (async () => {
      if (accountAddress) {
        await transactionsActions.loadTransactions(
          accountAddress,
          token.address,
          true
        );

        const cardColor =
          ColorMappingOverrides[project ?? "default"] ??
          communityConfig.community.theme?.primary ??
          "#272727";

        setCardColor(cardColor);
        setLoading(false);
      }
    })();
  }, [
    accountAddress,
    transactionsActions,
    token.address,
    project,
    communityConfig,
  ]);

  useFocusEffect(() => {
    let unsubscribe: () => void | undefined;

    if (accountAddress) {
      profilesActions.loadProfile(initialProfile?.account ?? accountAddress);
      actions.fetchBalance(token.address);
      unsubscribe = transactionsActions.listen(accountAddress, token.address);
    }

    return () => {
      unsubscribe?.();
    };
  }, [
    profilesActions,
    actions,
    transactionsActions,
    initialProfile,
    accountAddress,
    token.address,
  ]);

  const handleTokenChange = useCallback(
    (tokenAddress: string) => {
      let path = serialNumber ? `/card/${serialNumber}` : `/${accountAddress}`;
      if (project) {
        path += `?project=${project}`;
      }
      if (tokenAddress) {
        path += path.includes("?")
          ? `&token=${tokenAddress}`
          : `?token=${tokenAddress}`;
      }

      setLoading(true);
      router.replace(path);
    },
    [serialNumber, accountAddress, project, router]
  );

  const handleTopUp = useCallback(() => {
    if (!topUpPlugin) return;

    window.open(
      `${topUpPlugin.url}?account=${accountAddress}&token=${token.address}`,
      "_blank"
    );
  }, [topUpPlugin, accountAddress, token.address]);

  const handleTxRendered = useCallback(
    (tx: ATransaction) => {
      ordersActions.loadOrderFromTxHash(tx.hash);
      profilesActions.loadProfile(tx.from);
      profilesActions.loadProfile(tx.to);
    },
    [ordersActions, profilesActions]
  );

  const fetchMoreOrders = useCallback(async () => {
    if (!accountAddress) return false;
    return transactionsActions.getTransactions(accountAddress, token.address);
  }, [transactionsActions, accountAddress, token]);

  const scrollableRef = useScrollableWindowFetcher(fetchMoreOrders);

  const balance = state((state) => state.balance ?? initialBalance ?? "0.00");
  const profile = profilesState(
    (state) =>
      state.profiles[initialProfile?.account ?? accountAddress] ??
      initialProfile
  );
  const profiles = profilesState((state) => state.profiles);

  const colors = getColors(cardColor);

  const orders = ordersState((state) => state.orders);

  return (
    <main
      ref={scrollableRef}
      className="relative flex h-screen w-full flex-col justify-start items-center"
      style={{
        backgroundColor: colors.light,
      }}
    >
      <div
        className="w-full flex flex-col justify-start items-center"
        style={{
          backgroundColor: colors.light,
        }}
      >
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 flex justify-center items-center">
          <Card
            cardColor={cardColor}
            profile={profile}
            balance={balance}
            small={isScrolled}
            config={config}
            tokenAddress={tokenAddress}
            className="mt-12 mb-8"
            onTokenChange={handleTokenChange}
            onTopUp={topUpPlugin && !hideTopUp ? handleTopUp : undefined}
          />
        </div>

        <Flex
          direction="column"
          align="center"
          className="w-full max-w-xl pt-[min(76vw,456px)] px-8 pb-16"
          gap="3"
        >
          {!loadingTransactions && !loading && transactions.length === 0 && (
            <Flex
              justify="center"
              align="center"
              direction="column"
              className="w-full max-w-full py-4 active:bg-muted rounded-lg transition-colors duration-500 ease-in-out "
              gap="3"
            >
              <Image
                src="/coins.png"
                alt="card"
                width={140}
                height={140}
                className="pb-8"
              />
              <Text>{t("no_transactions_yet")}</Text>
            </Flex>
          )}

          {loading && (
            <Flex
              justify="center"
              direction="column"
              gap="3"
              className={cn(
                "w-full items-center justify-between text-sm animate-fade-in"
              )}
            >
              <Skeleton
                className="w-full h-28 rounded-lg shadow-md transition-shadow border"
                style={{ borderColor: colors.primary }}
              />
              <Skeleton
                className="w-full h-28 rounded-lg shadow-md transition-shadow border"
                style={{ borderColor: colors.primary }}
              />
              <Skeleton
                className="w-full h-28 rounded-lg shadow-md transition-shadow border"
                style={{ borderColor: colors.primary }}
              />
            </Flex>
          )}

          {loading ||
            (transactions.length > 0 &&
              transactions.map((transaction) => (
                <TxCard
                  key={transaction.id}
                  serialNumber={serialNumber}
                  cardAddress={accountAddress}
                  transaction={transaction}
                  order={orders[transaction.hash]}
                  profiles={profiles}
                  colors={colors}
                  project={project}
                  token={token}
                  onTxRendered={handleTxRendered}
                />
              )))}
        </Flex>
      </div>
    </main>
  );
}
