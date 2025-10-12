import { QueryClient } from "@tanstack/react-query";
import { Api } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey: [url] }) => {
        if (typeof url !== 'string') {
          throw new Error(`Invalid URL passed to queryKey: ${url}`)
        }

        return Api.get(url);
      },
    },
  },
})
