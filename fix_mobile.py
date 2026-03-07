import re

path = 'apps/frontend/src/app/marketx-os/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Fix root scroll (allow vertical scroll, prevent horizontal)
content = content.replace(
    "className={`page-scale relative min-h-screen overflow-hidden ${colors.bg}",
    "className={`page-scale relative min-h-screen overflow-x-hidden flex flex-col ${colors.bg}"
)

# 2. Hide scrollbar on mobile nav
content = content.replace(
    "className='flex gap-2 overflow-x-auto pb-1'",
    "className='flex gap-2 overflow-x-auto pb-1 hide-scrollbar'"
)

# 3. Add hide-scrollbar CSS
css_addition = """        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar {"""
content = content.replace(".custom-scrollbar::-webkit-scrollbar {", css_addition)

# 4. Fix Angles massive padding on mobile
content = content.replace(
    "p-12 rounded-[3.5rem]",
    "p-6 sm:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem]"
)

# 5. Fix Tree Modal missing scroll on mobile
content = content.replace(
    "className={`w-full max-w-3xl overflow-hidden rounded-[1.8rem]",
    "className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar rounded-[1.8rem]"
)

# Make modal header sticky so it stays visible while scrolling content
content = content.replace(
    "className={`border-b ${colors.borderSoft} bg-gradient-to-br ${NODE_THEME[selectedTreeNode.type as NodeType].panel} p-5 sm:p-6`}",
    "className={`sticky top-0 z-10 border-b ${colors.borderSoft} bg-gradient-to-br ${NODE_THEME[selectedTreeNode.type as NodeType].panel} p-5 sm:p-6 backdrop-blur-xl`}"
)

# 6. Fix oversized mobile typography
content = content.replace("text-[2rem]", "text-3xl sm:text-[2rem]")
content = content.replace("text-[2.2rem]", "text-4xl sm:text-[2.2rem]")

with open(path, 'w') as f:
    f.write(content)

print("Mobile responsiveness fixed.")
