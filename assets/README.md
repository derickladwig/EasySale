# EasySale Brand Asset Pack (v2)

This rebuild fixes an issue where background-to-transparent conversion could accidentally alter interior details.
v2 uses **edge flood-fill background removal**, so interior elements (like the teal checkmark) are preserved.

## Contents
- `icons/` transparent masters + common UI sizes
- `logos/` transparent masters + header widths (PNG + WEBP)
- `favicons/` favicon.ico + PNG favicon set
- `app-icons/` apple touch + PWA icons
- `css/` `easysale-brand.css` tokens + auto switching helpers

## Theme Consistency
Use the light assets on light surfaces and dark assets on dark surfaces. Keep the teal accent as the success/transaction signal.
