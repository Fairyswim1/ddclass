import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { isImportableProblemType } from '../utils/problemToSlide';

export function useArchiveProblems(currentUser) {
    const [archiveProblems, setArchiveProblems] = useState([]);
    const [archiveLoading, setArchiveLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) {
            setArchiveProblems([]);
            setArchiveLoading(false);
            return;
        }

        let cancelled = false;

        const load = async () => {
            setArchiveLoading(true);
            try {
                const q = query(
                    collection(db, 'problems'),
                    where('teacherId', '==', currentUser.uid)
                );
                const snapshot = await getDocs(q);
                const items = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                    .filter(
                        (p) =>
                            p.pinNumber != null &&
                            p.pinNumber !== '' &&
                            isImportableProblemType(p.type)
                    );

                items.sort((a, b) => {
                    const getTime = (val) => {
                        if (!val) return 0;
                        if (val.toMillis) return val.toMillis();
                        if (val.seconds) return val.seconds * 1000;
                        return new Date(val).getTime() || 0;
                    };
                    return getTime(b.createdAt) - getTime(a.createdAt);
                });

                if (!cancelled) setArchiveProblems(items);
            } catch (error) {
                console.error('보관함 불러오기 실패:', error);
            } finally {
                if (!cancelled) setArchiveLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [currentUser?.uid]);

    return { archiveProblems, archiveLoading };
}
