import { useMeQuery, User } from '@/queries/user.ts';
import { createContext, useContext } from 'react';

/**
 * React context for managing authenticated user state throughout the application.
 * We'll use it in (authenticated) routes where components can call useUser() to get the current user.
 */
const UserContext = createContext<User | undefined>(undefined);

/**
 * Provider component that wraps the application and provides user context to all child components.
 * Since the "parent" route.tsx will do a beforeLoad to fetch the user data, this component
 * can safely assume the data is available when it renders.
 */
export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { data } = useMeQuery();

  return <UserContext.Provider value={data}>{children}</UserContext.Provider>;
};

/**
 * Custom hook to access the current authenticated user's information.
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
