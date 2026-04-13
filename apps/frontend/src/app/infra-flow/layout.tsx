export default function InfraFlowLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ overflow: 'auto', height: '100vh', width: '100vw' }}>
            {children}
        </div>
    )
}
