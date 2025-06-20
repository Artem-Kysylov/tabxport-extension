// Chrome Extension API типы
declare namespace chrome {
  namespace runtime {
    const id: string
    const lastError: { message: string } | undefined
  }

  namespace identity {
    interface LaunchWebAuthFlowOptions {
      url: string
      interactive: boolean
    }

    interface GetAuthTokenOptions {
      interactive: boolean
    }

    function launchWebAuthFlow(
      options: LaunchWebAuthFlowOptions,
      callback: (responseUrl?: string) => void
    ): void

    function getAuthToken(
      options: GetAuthTokenOptions,
      callback: (token?: string) => void
    ): void
  }
} 