type Props = {
    compact?: boolean;
};

export default function MedVerseMark({ compact = false }: Props) {
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: compact ? 10 : 14,
            }}
        >
            <div
                style={{
                    width: compact ? 38 : 48,
                    height: compact ? 38 : 48,
                    borderRadius: 16,
                    background:
                        'linear-gradient(145deg, #19b6a4 0%, #3b82f6 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontWeight: 900,
                    boxShadow: '0 16px 36px rgba(25, 182, 164, .35)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <span style={{ fontSize: compact ? 18 : 22 }}>M</span>
            </div>

            <div>
                <div
                    style={{
                        fontSize: compact ? 18 : 24,
                        fontWeight: 900,
                        lineHeight: 1,
                        letterSpacing: '-0.04em',
                    }}
                >
                    MedVerse
                </div>
                {!compact && (
                    <div
                        style={{
                            marginTop: 5,
                            color: '#6a7c7a',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        Clinical intelligence workspace
                    </div>
                )}
            </div>
        </div>
    );
}