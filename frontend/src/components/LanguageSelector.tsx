import { useState, useEffect, useRef, useMemo } from 'react';
import type { Language } from '../types';
import { QUICK_LANGUAGES } from '../types';

interface Props {
    selected: string;            // language code, e.g. "en"
    onChange: (code: string) => void;
}

export default function LanguageSelector({ selected, onChange }: Props) {
    const [allLanguages, setAllLanguages] = useState<Language[]>([]);
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Fetch all languages from API once.
    useEffect(() => {
        fetch('/api/languages')
            .then((r) => r.json())
            .then((data: Language[]) => setAllLanguages(data))
            .catch(() => { });
    }, []);

    // Close dropdown on click outside.
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Filter languages: exclude quick-pick ones and apply search.
    const quickCodes = new Set(QUICK_LANGUAGES.map((l) => l.code));
    const filteredLanguages = useMemo(() => {
        const q = search.toLowerCase();
        return allLanguages
            .filter((l) => !quickCodes.has(l.code))
            .filter((l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
    }, [allLanguages, search]);

    const selectedName = useMemo(() => {
        const quick = QUICK_LANGUAGES.find((l) => l.code === selected);
        if (quick) return quick.name;
        const all = allLanguages.find((l) => l.code === selected);
        return all ? all.name : selected;
    }, [selected, allLanguages]);

    const handleSelectFromDropdown = (code: string) => {
        onChange(code);
        setShowDropdown(false);
        setSearch('');
    };

    return (
        <div className="language-selector glass-card">
            <div className="language-selector-header">
                <span className="language-selector-label">🌐 Source Language</span>
                <span className="language-selector-selected">{selectedName}</span>
            </div>

            {/* Quick-pick pills */}
            <div className="language-quick-picks">
                {QUICK_LANGUAGES.map((lang) => (
                    <button
                        key={lang.code}
                        className={`language-pill ${selected === lang.code ? 'active' : ''}`}
                        onClick={() => onChange(lang.code)}
                    >
                        {lang.name}
                    </button>
                ))}
            </div>

            {/* Search dropdown */}
            <div className="language-search-wrapper" ref={dropdownRef}>
                <input
                    ref={searchRef}
                    className="language-search-input"
                    type="text"
                    placeholder="Search 99+ languages…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                />

                {showDropdown && (
                    <div className="language-dropdown">
                        {filteredLanguages.length === 0 ? (
                            <div className="language-dropdown-empty">No languages found</div>
                        ) : (
                            filteredLanguages.map((lang) => (
                                <div
                                    key={lang.code}
                                    className={`language-dropdown-item ${selected === lang.code ? 'active' : ''}`}
                                    onClick={() => handleSelectFromDropdown(lang.code)}
                                >
                                    <span className="language-dropdown-name">{lang.name}</span>
                                    <span className="language-dropdown-code">{lang.code}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
