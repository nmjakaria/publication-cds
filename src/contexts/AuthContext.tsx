import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  isAdmin: false,
  isStaff: false,
  setUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        const userDoc = await getDoc(doc(db, 'users', fUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // CONFIGURE INITIAL ADMIN EMAIL HERE
          const INITIAL_ADMIN_EMAIL = 'nmjakaria01@gmail.com'; 
          const role: UserRole = fUser.email === INITIAL_ADMIN_EMAIL ? 'admin' : 'staff';
          const newUser: User = {
            uid: fUser.uid,
            email: fUser.email || '',
            name: fUser.displayName || 'No Name',
            role: role,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', fUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, isAdmin, isStaff, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
