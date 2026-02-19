import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [nickname, setNickname] = useState('선생님');
    const [loading, setLoading] = useState(true);

    const loginWithGoogle = () => {
        return signInWithPopup(auth, googleProvider);
    };

    const logout = () => {
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
                    if (profileDoc.exists()) {
                        setNickname(profileDoc.data().nickname || '선생님');
                    } else {
                        const initialNickname = user.displayName || '선생님';
                        await setDoc(doc(db, 'profiles', user.uid), {
                            nickname: initialNickname,
                            updatedAt: new Date()
                        });
                        setNickname(initialNickname);
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                    setNickname('선생님');
                }
            } else {
                setNickname('선생님');
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        nickname,
        setNickname,
        loading,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
