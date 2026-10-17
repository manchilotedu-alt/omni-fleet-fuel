import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './lib/api';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { supabase } from './lib/supabase';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Edit3,
  FileText,
  Fuel,
  Gauge,
  History,
  LayoutDashboard,
  KeyRound,
  House,
  LogOut,
  MoreVertical,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  UserCog,
  UserCircle,
  Wrench,
  X,
  Eye,
  EyeOff,
  Moon,
  Sun,
} from 'lucide-react';
import * as React from 'react';

type Lang = 'en' | 'am';
const APP_VERSION = '1.0.1';
type AppUser = { id: string; email: string; name: string; phone?: string };

const translations: Record<string, string> = {
  'Dashboard': 'ዳሽቦርድ',
  'Home': 'ሆም',
  'All Vehicles': 'ሁሉም ተሽከርካሪዎች',
  'Vehicle List': 'የተሽከርካሪዎች ዝርዝር',
  'Fuel Entry': 'የነዳጅ መመዝገቢያ',
  'Fuel Priority': 'የነዳጅ ቅድሚያ',
  'Working Calendar': 'የሥራ ቀን ቀን መቁጠሪያ',
  'Fuel History': 'የነዳጅ ታሪክ',
  'Monthly Report': 'ወርሃዊ ሪፖርት',
  'Reports': 'ሪፖርቶች',
  'Daily': 'ዕለታዊ',
  'Weekly': 'ሳምንታዊ',
  'Monthly': 'ወርሃዊ',
  'Custom Range': 'የተመረጠ የቀን ክልል',
  'Start Date': 'የመጀመሪያ ቀን',
  'End Date': 'የመጨረሻ ቀን',
  'Apply': 'ተግብር',
  'Lock': 'ቆልፍ',
  'Unlock': 'ክፈት',
  'Enter PIN': 'ፒን ያስገቡ',
  'Incorrect PIN': 'የገባው ፒን ትክክል አይደለም',
  'PIN Lock': 'የፒን መቆለፊያ',
  'Yearly': 'ዓመታዊ',
  'Add vehicle now': 'ተሽከርካሪ አሁን ጨምር',
  'Telebirr': 'ቴሌብር',
  'Settings': 'ቅንብሮች',
  'Request Password Reset': 'የይለፍ ቃል መመለሻ ጥያቄ ላክ',
  'Your reset request has been recorded. Contact the administrator to complete the reset.': 'የይለፍ ቃል መመለሻ ጥያቄዎ ተመዝግቧል። ሂደቱን ለማጠናቀቅ አስተዳዳሪውን ያነጋግሩ።',
  'A password reset request is already waiting for the administrator.': 'የይለፍ ቃል መመለሻ ጥያቄዎ በአስተዳዳሪው እየተጠባበቀ ነው።',
  'Biometric Unlock': 'በፊት ወይም በጣት አሻራ መክፈቻ',
  'Use Face ID or Fingerprint to unlock this app on this device.': 'ይህን መተግበሪያ በፊት ማወቂያ ወይም በጣት አሻራ ለመክፈት ይጠቀሙ።',
  'Enable biometric unlock': 'የባዮሜትሪክ መክፈቻን አብራ',
  'Disable biometric unlock': 'የባዮሜትሪክ መክፈቻን አጥፋ',
  'Biometric unlock enabled on this device.': 'በዚህ መሣሪያ የባዮሜትሪክ መክፈቻ በርቷል።',
  'Biometric unlock disabled.': 'የባዮሜትሪክ መክፈቻ ጠፍቷል።',
  'Biometric authentication is available only in the installed mobile app.': 'የባዮሜትሪክ ማረጋገጫ በተጫነው የሞባይል መተግበሪያ ብቻ ይሰራል።',
  'Set up Face ID or fingerprint on your device first.': 'መጀመሪያ በስልክዎ ቅንብር ውስጥ የፊት ወይም የጣት አሻራ ማረጋገጫን ያዘጋጁ።',
  'Biometric authentication was not completed. You can still sign in with your password.': 'የባዮሜትሪክ ማረጋገጫው አልተጠናቀቀም። አሁንም በይለፍ ቃል መግባት ይችላሉ።',
  'Profile': 'መገለጫ',
  'Notifications': 'ማሳወቂያዎች',
  'Change photo': 'ፎቶ ቀይር',
  'Remove photo': 'ፎቶ አስወግድ',
  'No name': 'ስም የለም',
  'Email': 'ኢሜይል',
  'Birth Date': 'የትውልድ ቀን',
  "Mother's Full Name": 'የእናት ሙሉ ስም',
  'The phone number does not match our records.': 'የስልክ ቁጥሩ ከመረጃችን ጋር አይመሳሰልም።', "The mother's full name does not match our records.": 'የእናት ሙሉ ስሙ ከመረጃችን ጋር አይመሳሰልም።', 'The birth date does not match our records.': 'የትውልድ ቀኑ ከመረጃችን ጋር አይመሳሰልም።',
  'Enter all required account information.': 'እባክዎ ሁሉንም የመለያ መረጃዎች ያስገቡ።',
  'Your account information is stored securely by the app server.': 'የመለያ መረጃዎ በአፕ ሰርቨር በደህንነት ይቀመጣል።',
  'Verification Code': 'የማረጋገጫ ኮድ',
  'Enter the 6-digit code': '6 አሃዝ ያለውን ኮድ ያስገቡ',
  'Verify': 'አረጋግጥ',
  'Verify Contact': 'የመገኛ አድራሻ ማረጋገጫ',
  'Recovery contact': 'የመልሶ ማግኛ መገኛ',
  'Email Address': 'የኢሜይል አድራሻ',
  'Email': 'ኢሜይል',
  'Email is required.': 'ኢሜይል ማስገባት ያስፈልጋል።',
  'Use the email address registered to this account.': 'በዚህ መለያ የተመዘገበውን ኢሜይል ይጠቀሙ።',
  'Enter your recovery email.': 'የመልሶ ማግኛ ኢሜይልዎን ያስገቡ።',
  'Password reset email sent. Open the link in your email to set a new password.': 'የይለፍ ቃል መቀየሪያ አገናኝ በኢሜይልዎ ተልኳል። አዲስ የይለፍ ቃል ለማዘጋጀት አገናኙን ይክፈቱ።',
  'Account created. Check your email to confirm your address, then sign in.': 'መለያው ተፈጥሯል። ኢሜይልዎን አረጋግጠው ከዚያ ይግቡ።',
  'Send Code': 'ኮድ ላክ',
  'A verification code has been sent.': 'የማረጋገጫ ኮድ ተልኳል።',
  'Enter your recovery email or phone.': 'የመልሶ ማግኛ ኢሜይል ወይም ስልክ ያስገቡ።',
  'Check your email for the verification code.': 'የማረጋገጫ ኮዱን ኢሜይልዎ ላይ ይመልከቱ።',
  'Check your phone for the verification code.': 'የማረጋገጫ ኮዱን በስልክዎ ይመልከቱ።',
  'Full name, recovery contact and password are stored securely by the app server.': 'ሙሉ ስም፣ የመልሶ ማግኛ መገኛ እና የይለፍ ቃል በአፕ ሰርቨር በደህንነት ይቀመጣሉ።',
  'Create a secure account with a recovery contact.': 'የመልሶ ማግኛ መገኛ ያለው ደህንነቱ የተጠበቀ መለያ ይፍጠሩ።',
  'Create a new password': 'አዲስ የይለፍ ቃል ይፍጠሩ',
  'Could not send the verification code.': 'የማረጋገጫ ኮዱን መላክ አልተቻለም።',
  'Password reset successfully. Please sign in with your new password.': 'የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል። አዲሱን የይለፍ ቃል ተጠቅመው ይግቡ።',
  'Account': 'መለያ',
  'Please choose an image file.': 'እባክዎ የምስል ፋይል ይምረጡ።',
  'Photo must be 2 MB or smaller.': 'ፎቶው 2 MB ወይም ከዚያ በታች መሆን አለበት።',
  'User Management': 'የተጠቃሚዎች አስተዳደር',
  'Recovery Requests': 'የመለያ መመለሻ ጥያቄዎች',
  'Access Controls': 'የመግቢያ ቁጥጥር',
  'Account and Device Access': 'የአካውንትና ስልክ መግቢያ ቁጥጥር',
  'Blocked': 'ታግዷል',
  'Approved': 'ተፈቅዷል',
  'Pending': 'በመጠባበቅ ላይ',
  'Block account': 'አካውንት አግድ',
  'Unblock account': 'አካውንት እገዳ አንሳ',
  'Block device': 'ስልክ አግድ',
  'Approve device': 'ስልክ ፍቀድ',
  'Pending recovery requests': 'በመጠባበቅ ላይ ያሉ የመለያ መመለሻ ጥያቄዎች',
  'Refresh': 'አድስ',
  'New password for this user': 'ለዚህ ተጠቃሚ አዲስ የይለፍ ቃል',
  'Reset password': 'የይለፍ ቃል ቀይር',
  'No recovery requests found.': 'የመለያ መመለሻ ጥያቄ አልተገኘም።',
  'Password reset completed. Tell the user to sign in with the new password.': 'የይለፍ ቃሉ ተቀይሯል። ተጠቃሚው በአዲሱ የይለፍ ቃል እንዲገባ ያሳውቁት።',
  'Only an organization administrator can manage recovery requests.': 'የመለያ መመለሻ ጥያቄዎችን ማስተዳደር የሚችለው የድርጅቱ አስተዳዳሪ ብቻ ነው።',
  'Add Vehicle': 'ተሽከርካሪ ጨምር',
  'Manual Override': 'በእጅ ማስተካከያ',
  'Early Fill': 'ነዳጅ ሙላ',
  'Off-Day History': 'የቀረበባቸው ቀናት ታሪክ',
  'Monthly': 'ወርሃዊ',
  'English': 'እንግሊዝኛ',
  'Amharic': 'አማርኛ',
  'Sign in': 'ግባ',
  'Sign out': 'ውጣ',
  'Welcome back': 'እንኳን ደህና መጡ',
  'Password': 'የይለፍ ቃል',
  'Employee ID': 'የሰራተኛ መለያ',
  'Remember me': 'አስታውሰኝ',
  'Forgot Password?': 'የይለፍ ቃል ረሱ?',
  'App Password': 'የአፕ የይለፍ ቃል',
  'Set App Password': 'የአፕ የይለፍ ቃል ያዘጋጁ',
  'Unlock App': 'አፑን ክፈት',
  'Create your app password': 'የአፕ የይለፍ ቃልዎን ይፍጠሩ',
  'Enter your app password to continue.': 'ለመቀጠል የአፕ የይለፍ ቃልዎን ያስገቡ።',
  'Confirm Password': 'የይለፍ ቃል ያረጋግጡ',
  'Passwords do not match.': 'የይለፍ ቃሎቹ አይመሳሰሉም።',
  'Incorrect app password.': 'የአፕ የይለፍ ቃሉ ትክክል አይደለም።',
  'Forgot app password?': 'የአፕ የይለፍ ቃሉን ረሱ?',
  'Reset with Google': 'በGoogle ዳግም አዘጋጅ',
  'Google verification is required to reset this app password.': 'ይህን የአፕ የይለፍ ቃል ዳግም ለማዘጋጀት Google ማረጋገጫ ያስፈልጋል።',
  'Today\'s Fuel Priority': 'የዛሬ የነዳጅ ቅድሚያ',
  'Manager Decision Support': 'የአስተዳዳሪ ውሳኔ ድጋፍ',
  'Due Today': 'ዛሬ የሚሞላ',
  'Near Due': 'ለመሙላት ተቃርቧል',
  'Safe': 'ደህንነት ላይ',
  'Total Vehicles': 'ጠቅላላ ተሽከርካሪዎች',
  'View Report': 'ሪፖርት ይመልከቱ',
  'View all': 'ሁሉንም ይመልከቱ',
  'Details': 'ዝርዝር',
  'Review': 'ይገምግሙ',
  'Record Fuel': 'ነዳጅ መዝግብ',
  'Find Vehicle': 'ተሽከርካሪ ፈልግ',
  'Monthly Report': 'ወርሃዊ ሪፖርት',
  'Reports': 'ሪፖርቶች',
  'Daily': 'ዕለታዊ',
  'Weekly': 'ሳምንታዊ',
  'Yearly': 'ዓመታዊ',
  'Add vehicle now': 'ተሽከርካሪ አሁን ጨምር',
  'Telebirr': 'ቴሌብር',
  'Working Days': 'የሥራ ቀናት',
  'Expected Fuel': 'የሚጠበቀው ነዳጅ',
  'Expected': 'የሚጠበቀው',
  'Status': 'ሁኔታ',
  'Action': 'ተግባር',
  'Plate': 'የሰሌዳ ቁጥር',
  'Vehicle': 'ተሽከርካሪ',
  'Fuel': 'ነዳጅ',
  'Cycle': 'ዙር',
  'Amount': 'መጠን',
  'Method': 'ዘዴ',
  'Reason': 'ምክንያት',
  'Date': 'ቀን',
  'Time': 'ሰዓት',
  'Status': 'ሁኔታ',
  'Due': 'የሚሞላ',
  'Working Day': 'የሥራ ቀን',
  'Sunday — Default Off-Day': 'እሁድ — ነባሪ የቀረበበት ቀን',
  'Sunday as Off-Day (default)': 'እሁድን እንደ ነባሪ የቀረበበት ቀን ተጠቀም',
  'Enable custom off-days': 'ተጨማሪ የቀረበባቸውን ቀናት አንቃ',
  'Require approval for Manual Override': 'በእጅ ማስተካከያ ላይ ፈቃድ ያስፈልግ',
  'Save Settings': 'ቅንብሮችን አስቀምጥ',
  'Save Vehicle': 'ተሽከርካሪን አስቀምጥ',
  'Cancel': 'ሰርዝ',
  'Add Off-Day': 'የቀረበበት ቀን ጨምር',
  'Save Off-Day': 'የእረፍት ቀንን አስቀምጥ',
  'Save selected off-day': 'የተመረጠውን የዕረፍት ቀን አስቀምጥ',
  'Delete selected off-day': 'የተመረጠውን የዕረፍት ቀን ሰርዝ',
  'Export': 'ላክ',
  'Export PDF': 'PDF ላክ',
  'Export Excel': 'Excel ላክ',
  'Administrator': 'አስተዳዳሪ',
  'Fleet Manager': 'የፍሊት አስተዳዳሪ',
  'Fuel scheduling & manager decision support': 'የነዳጅ መርሐ ግብር እና የአስተዳዳሪ ውሳኔ ድጋፍ',
  'omni-Fleet Fuel Monitoring': 'ኦምኒ-ፍሊት የነዳጅ ክትትል',
  'Monitoring': 'ክትትል',
  'Schedule fuel cycles, calculate working days, rank priority and support manager decisions in one place.': 'የነዳጅ ዙሮችን ያስተዳድሩ፣ የሥራ ቀናትን ያስሉ፣ ቅድሚያን ይደልድሉ እና የአስተዳዳሪ ውሳኔን በአንድ ቦታ ይደግፉ።',
  'Review Priority': 'ቅድሚያን ይመልከቱ',
  'vehicles are due for fuel': 'ተሽከርካሪዎች ነዳጅ መሙላት አለባቸው',
  'Priority is calculated from working days, fuel cycle and registered off-days.': 'ቅድሚያ የሚሰላው በሥራ ቀናት፣ በነዳጅ ዙር እና በተመዘገቡ የእረፍት ቀናት ላይ ተመስርቶ ነው።',
  "Today's Fuel Priority": 'የዛሬ የነዳጅ ቅድሚያ',
  'View all': 'ሁሉንም ይመልከቱ',
  'Details': 'ዝርዝር',
  'Plate, code, type, branch...': 'የሰሌዳ ቁጥር፣ ኮድ፣ ዓይነት፣ ቅርንጫፍ...',
  'All': 'ሁሉም',
  'Vehicle Code': 'የተሽከርካሪ ኮድ',
  'Contact Name': 'ስም',
  'Full Name': 'ሙሉ ስም',
  'Create Account': 'መለያ ፍጠር',
  'Sign In': 'ግባ',

  'Reset Password': 'የይለፍ ቃል ዳግም አዘጋጅ',
  'Phone Number': 'ስልክ ቁጥር',
  "Father's Full Name": 'የአባት ሙሉ ስም',
  "Enter your mother's full name": 'የእናትዎን ሙሉ ስም ያስገቡ',
  "Enter your father's full name": 'የአባትዎን ሙሉ ስም ያስገቡ',
  'Phone number is required.': 'ስልክ ቁጥር ማስገባት ያስፈልጋል።',
  'Create an account with your phone number and recovery details.': 'በስልክ ቁጥርና በመልሶ ማግኛ መረጃዎች መለያ ይፍጠሩ።',
  'Use the phone number registered to this account.': 'በዚህ መለያ የተመዘገበውን ስልክ ቁጥር ይጠቀሙ።',
  'New Password': 'አዲስ የይለፍ ቃል',
  'Enter phone, mother name and birth date.': 'ስልክ፣ የእናት ሙሉ ስምና የትውልድ ቀን ያስገቡ።',
  'The phone number or recovery details could not be verified.': 'የስልክ ቁጥሩ ወይም የማረጋገጫ መረጃዎቹ ሊረጋገጡ አልቻሉም።',
  'This phone number is already registered.': 'ይህ ስልክ ቁጥር አስቀድሞ ተመዝግቧል።',
  'Enter a valid phone number with country code, or an Ethiopian 09/9 number.': 'ትክክለኛ ስልክ ቁጥር ያስገቡ።',
  "Enter your full name and both parents' full names.": 'የራስዎን፣ የእናትዎንና የአባትዎን ሙሉ ስም ያስገቡ።',
  'Plate Number': 'የሰሌዳ ቁጥር',
  'Vehicle Type': 'የተሽከርካሪ ዓይነት',
  'Fuel Type': 'የነዳጅ ዓይነት',
  'Fuel Cycle (Working Days)': 'የነዳጅ ዙር (በሥራ ቀናት)',
  'Branch': 'ቅርንጫፍ',
  'Last Filled Date': 'የመጨረሻ መሙያ ቀን',
  'Working Days Already Used (optional)': 'እስካሁን የተጠቀሙት የሥራ ቀናት (አማራጭ)',
  'Leave blank to calculate from Last Filled Date. Enter the current progress if the cycle started before using this app.': 'የመጨረሻ መሙያ ቀንን ተከትሎ እንዲሰላ ባዶ ይተዉት። ዑደቱ አፑን ከመጠቀምዎ በፊት ከጀመረ እስካሁን የተሰሩትን የሥራ ቀናት ያስገቡ።',
  'Register the vehicle and define its fuel cycle in working days.': 'ተሽከርካሪውን ይመዝግቡ እና የነዳጅ ዙሩን በሥራ ቀናት ይወስኑ።',
  'Back to vehicles': 'ወደ ተሽከርካሪዎች ተመለስ',
  'Edit': 'አርም',
  'Overview': 'አጠቃላይ እይታ',
  'Off-Days': 'የቀረበባቸው ቀናት',
  'Notes': 'ማስታወሻዎች',
  'Expected Next Fuel': 'የሚጠበቀው ቀጣይ ነዳጅ',
  'Last Filled': 'የመጨረሻ መሙያ',
  'Days Remaining': 'የቀሩ ቀናት',
  'Expected Date': 'የሚጠበቀው ቀን',
  'Fuel Due': 'ነዳጅ መሙላት ያለበት ቀን',
  'Audit data will include the reason, approving officer, date and time.': 'የኦዲት መረጃው ምክንያትን፣ ያጸደቀውን ኃላፊ፣ ቀን እና ሰዓት ያካትታል።',
  'Select a vehicle.': 'ተሽከርካሪ ይምረጡ።',
  'Record a normal fuel fill. Saving starts a new fuel cycle.': 'መደበኛ የነዳጅ መሙላትን ይመዝግቡ። ማስቀመጥ አዲስ የነዳጅ ዙር ይጀምራል።',
  'Save & Start New Cycle': 'አስቀምጥ እና አዲስ ዙር ጀምር',
  'Payment Method': 'የክፍያ ዘዴ',
  'Normal': 'መደበኛ',
  'Operational Need': 'የሥራ ፍላጎት',
  'Record a fill before the expected date without resetting the normal cycle.': 'ከሚጠበቀው ቀን በፊት የተሞላ ነዳጅን ይመዝግቡ፤ መደበኛው ዙር አይቀየርም።',
  'Record Early Fill': 'ነዳጅ ሙላ',
  'Expected date:': 'የሚጠበቀው ቀን:',
  'The scheduled cycle will be preserved.': 'የተወሰነው የነዳጅ ዙር ይጠበቃል።',
  'Long Trip': 'ረጅም ጉዞ',
  'Emergency': 'አስቸኳይ ሁኔታ',
  'Note': 'ማስታወሻ',
  'Long trip or exceptional operational need': 'ረጅም ጉዞ ወይም ልዩ የሥራ ፍላጎት',
  'Register an exceptional fuel decision without destroying the vehicle\'s normal cycle.': 'የተሽከርካሪውን መደበኛ ዙር ሳያበላሹ ልዩ የነዳጅ ውሳኔን ይመዝግቡ።',
  'Override Reason': 'የማስተካከያ ምክንያት',
  'Approved By': 'ያጸደቀው',
  'Fuel saved and new cycle started!': 'ነዳጅ ተቀምጧል እና አዲስ ዙር ተጀምሯል!',
  'Fuel event recorded!': 'የነዳጅ ክስተት ተመዝግቧል!',
  'Timing': 'ጊዜ ሁኔታ',
  'OK': 'እሺ',
  'Mon': 'ሰኞ', 'Tue': 'ማክሰኞ', 'Wed': 'ረቡዕ', 'Thu': 'ሐሙስ', 'Fri': 'ዓርብ', 'Sat': 'ቅዳሜ', 'Sun': 'እሁድ',
  'Working Day': 'የሥራ ቀን',
  'Sunday/Custom': 'እሁድ/ተጨማሪ',
  'Excluded from working days': 'ከሥራ ቀናት ውስጥ የተወገደ',
  'Add Off-Day': 'የቀረበበት ቀን ጨምር',
  'This date will be excluded from the selected vehicle\'s working-day fuel cycle.': 'ይህ ቀን ከተመረጠው ተሽከርካሪ የሥራ ቀን የነዳጅ ዙር ውስጥ ይወገዳል።',
  'Garage': 'ጋራዥ',
  'Breakdown': 'ብልሽት',
  'Driver N/A': 'ሾፌር የለም',
  'Holiday': 'በዓል',
  'Vehicle under maintenance': 'ተሽከርካሪው በጥገና ላይ ነው',
  'Impact': 'ተፅዕኖ',
  'Fuel Priority — Management View': 'የነዳጅ ቅድሚያ — የአስተዳደር እይታ',
  'Expected Fuel Date': 'የሚጠበቀው የነዳጅ ቀን',
  'Decision': 'ውሳኔ',
  'The system calculates and ranks priority. The manager makes the final fuel decision.': 'ስርዓቱ ቅድሚያን ያሰላና ያደራጃል። የመጨረሻ የነዳጅ ውሳኔ የአስተዳዳሪው ነው።',
  'Fuel History': 'የነዳጅ ታሪክ',
  'Every fuel event, including early fills and manual overrides': 'ነዳጅ ሙላ እና በእጅ ማስተካከያዎችን ጨምሮ ሁሉም የነዳጅ ክስተቶች',
  'Reason / Approval': 'ምክንያት / ማጽደቂያ',
  'Approved by': 'ያጸደቀው',
  'Report Period': 'የሪፖርት ጊዜ',
  'Current Month': 'የአሁኑ ወር',
  'Previous Month': 'ያለፈው ወር',
  'Fuel Cost (ETB)': 'የነዳጅ ወጪ (ብር)',
  'Due Now': 'አሁን የሚሞላ',
  'Early / Override Events': 'ነዳጅ ሙላ / ማስተካከያ ክስተቶች',
  'Fuel Event Overview': 'የነዳጅ ክስተቶች አጠቃላይ እይታ',
  'Fuel Scheduling Rules': 'የነዳጅ መርሐ ግብር ደንቦች',
  'The system uses management-supplied data. Sundays are excluded by default and vehicle-specific off-days can be registered.': 'ስርዓቱ በአስተዳደር በሚሰጥ መረጃ ይሠራል። እሁዶች በነባሪ ከሥራ ቀናት ውጭ ናቸው፣ ለእያንዳንዱ ተሽከርካሪም የእረፍት ቀናት መመዝገብ ይቻላል።',
  'Default Currency': 'ነባሪ ምንዛሬ',
  'ETB (Birr)': 'ብር (ETB)',
  'USD': 'ዶላር (USD)',
  'System Users': 'የስርዓት ተጠቃሚዎች',
  'Manager, Supervisor, Data Entry and Viewer access': 'የአስተዳዳሪ፣ የተቆጣጣሪ፣ የመረጃ መግቢያ እና የተመልካች መዳረሻ',
  'Add User': 'ተጠቃሚ ጨምር',
  'New User Name': 'የአዲስ ተጠቃሚ ስም',
  'Employee name': 'የሰራተኛ ስም',
  'Role': 'ሚና',
  'Manager': 'አስተዳዳሪ',
  'Supervisor': 'ተቆጣጣሪ',
  'Data Entry': 'የመረጃ መግቢያ',
  'Viewer': 'ተመልካች',
  'Active': 'ንቁ',
  'Blocked': 'ታግዷል',
  'Save': 'አስቀምጥ',
  'User added': 'ተጠቃሚው ተጨምሯል',
  'Settings saved': 'ቅንብሮች ተቀምጠዋል',
  'Vehicle added successfully': 'ተሽከርካሪው በተሳካ ሁኔታ ተጨምሯል',
  'Vehicle removed successfully': 'ተሽከርካሪው በተሳካ ሁኔታ ተወግዷል',
  'Remove Vehicle': 'ተሽከርካሪ አስወግድ',
  'Are you sure you want to remove this vehicle? Its fuel history and off-day records will also be removed.': 'ይህን ተሽከርካሪ ማስወገድ እርግጠኛ ነዎት? የነዳጅ ታሪኩ እና የእረፍት ቀናት መዝገቦችም ይወገዳሉ።',
  'Fuel filled and new cycle started': 'ነዳጅ ተሞልቷል እና አዲስ ዙር ተጀምሯል',
  'Early fill recorded; normal cycle preserved': 'ነዳጅ ሙላ ተመዝግቧል፤ መደበኛው ዙር ተጠብቋል',
  'Off-day saved; working-day calculations updated': 'የእረፍት ቀን ተቀምጧል፤ የሥራ ቀን ስሌቶች ተዘምነዋል',
  'Isuzu': 'አይሱዙ',
  'Dolphin': 'ዶልፊን',
  'Fifiel': 'ፋይፍኤል',
  'Hysi': 'ሀይሲ',
  'Pickup': 'ፒካፕ',
  'Vitz': 'ቪትዝ',
  'Land Cruiser': 'ላንድ ክሩዘር',
  'Van': 'ቫን',
  'Minibus': 'ሚኒባስ',
  'Truck': 'ትራክ',
  'Bus': 'አውቶቡስ',
  'Tanker': 'ታንከር',
  'Tractor': 'ትራክተር',
  'Other': 'ሌላ',
  'Diesel': 'ናፍጣ',
  'Petrol': 'ቤንዚን',
  'Cash': 'ጥሬ ገንዘብ',
  'Bank': 'ባንክ',
  'Fuel Card': 'የነዳጅ ካርድ',
  'Head Office': 'ዋና መስሪያ ቤት',
  'Branch 1': 'ቅርንጫፍ 1',
  'Branch 2': 'ቅርንጫፍ 2',
  'Normal (Due Date)': 'መደበኛ (የመሙያ ቀን)',
  'Early Fill': 'ነዳጅ ሙላ',
  'Manual Override': 'በእጅ ማስተካከያ',
  'Sunday — Default Off-Day': 'እሁድ — ነባሪ የቀረበበት ቀን', 
  'Sundays excluded automatically': 'እሁዶች በራስ-ሰር ከሥራ ቀናት ውጭ ናቸው',
  'vehicles': 'ተሽከርካሪዎች',
  'vehicles · Sundays excluded automatically': 'ተሽከርካሪዎች · እሁዶች በራስ-ሰር ከሥራ ቀናት ውጭ ናቸው',
  'Checking secure session...': 'የደህንነት መግቢያ እየተረጋገጠ ነው...',
  'No new notifications': 'አዲስ ማሳወቂያ የለም',
  'Schedule fuel cycles, calculate working days, rank priority and support manager decisions in one place.': 'የነዳጅ ዙሮችን ያስተዳድሩ፣ የሥራ ቀናትን ያስሉ፣ ቅድሚያን ይደልድሉ እና የአስተዳዳሪ ውሳኔን በአንድ ቦታ ይደግፉ።',
  'Sign in to manage fleet fuel scheduling': 'የፍሊት ነዳጅ ማስተዳደሪያን ለመጠቀም ይግቡ',
  'Opening secure sign-in...': 'የደህንነት መግቢያ እየተከፈተ ነው...',
  'Login is now connected to real AppDeploy authentication. No fake employee ID or password is accepted.': 'መግቢያው ከእውነተኛ AppDeploy ማረጋገጫ ጋር ተገናኝቷል። የሐሰት የሰራተኛ መለያ ወይም የይለፍ ቃል አይቀበልም።',
  'Please allow pop-ups to sign in securely.': 'በደህንነት ለመግባት የተከፈተውን የፖፕ አፕ መስኮት ይፍቀዱ።',
  'Sign-in was cancelled.': 'የመግባት ሂደቱ ተሰርዟል።',
  'Secure sign-in failed. Please try again.': 'የደህንነት መግቢያው አልተሳካም። እንደገና ይሞክሩ።',
  'Type': 'ዓይነት',
  'Save & Start New Cycle': 'አስቀምጥ እና አዲስ ዙር ጀምር',
  'Record Override': 'ማስተካከያ መዝግብ',
  'Fuel Due': 'ነዳጅ መሙላት ያለበት ቀን', 
  'Back to vehicles': 'ወደ ተሽከርካሪዎች ተመለስ',
  'Fuel Event Overview': 'የነዳጅ ክስተቶች አጠቃላይ እይታ',
  'Vehicles': 'ተሽከርካሪዎች',
  'Fuel Event': 'የነዳጅ ክስተት',
  'Priority': 'ቅድሚያ',
  'Report Period': 'የሪፖርት ጊዜ',
  'Export PDF': 'PDF ላክ',
  'Export Excel': 'Excel ላክ',
  'Current cycle': 'የአሁኑ ዙር',
  'is': 'ነው',
  'days': 'ቀናት',
  'Due Today': 'ዛሬ የሚሞላ',
  'Review Priority': 'ቅድሚያን ይመልከቱ',
  'Add Off-Day': 'የቀረበበት ቀን ጨምር',
  'Sunday — Default Off-Day': 'እሁድ — ነባሪ የቀረበበት ቀን',
  'Sundays excluded automatically': 'እሁዶች በራስ-ሰር ከሥራ ቀናት ውጭ ናቸው',
  'Normal': 'መደበኛ',
  'Operational Need': 'የሥራ ፍላጎት',
  'Long Trip': 'ረጅም ጉዞ',
  'Emergency': 'አስቸኳይ ሁኔታ',
  'Other': 'ሌላ',
  'Working Days': 'የሥራ ቀናት',
  'Cycle': 'ዙር',
  'Method': 'ዘዴ',
  'Timing': 'ጊዜ ሁኔታ',
  'Remove Vehicle': 'ተሽከርካሪ አስወግድ',
  'No new notifications': 'አዲስ ማሳወቂያ የለም',
  'Please select a vehicle': 'እባክዎ ተሽከርካሪ ይምረጡ',
  'Search by name or phone': 'በስም ወይም በስልክ ፈልግ',
  'Search by name, plate, phone or branch': 'በስም፣ በሰሌዳ፣ በስልክ ወይም በቅርንጫፍ ፈልግ',
  'No matching vehicles found.': 'የሚዛመድ ተሽከርካሪ አልተገኘም።',
  'Scheduled Working Days': 'የታቀዱ የሥራ ቀናት',
  'Recorded Off-Days': 'የተመዘገቡ የቀሪ ቀናት',
  'Call': 'ደውል',
  'Monthly Vehicle Finance': 'ወርሃዊ የተሽከርካሪ ፋይናንስ',
  'Each vehicle is calculated separately. Total month days are fixed at 30.': 'እያንዳንዱ ተሽከርካሪ ለብቻው ይሰላል። የወሩ ጠቅላላ ቀናት 30 ተብለው ተወስነዋል።',
  'Month': 'ወር',
  'Total Days': 'ጠቅላላ ቀናት',
  'Entered Days': 'የሰሩበት ቀናት',
  'Remaining Days': 'የቀሩ የሥራ ቀናት',
  'Welcome Back!': 'እንኳን ደህና መጡ!', 'Create Your Account': 'መለያዎን ይፍጠሩ', 'Enter your name and create a new password.': 'ስምዎን ያስገቡ እና አዲስ የይለፍ ቃል ይፍጠሩ።', 'Simple secure access to omni-Fleet': 'ወደ ኦምኒ-ፍሊት ቀላልና ደህንነቱ የተጠበቀ መግቢያ', 'Enter your full name': 'ሙሉ ስምዎን ያስገቡ', 'Enter your password': 'የይለፍ ቃልዎን ያስገቡ', 'Confirm password': 'የይለፍ ቃልዎን ያረጋግጡ', 'Hide password': 'የይለፍ ቃሉን ደብቅ', 'Show password': 'የይለፍ ቃሉን አሳይ',  'Use the phone number registered to this account.': 'በዚህ መለያ የተመዘገበውን ስልክ ቁጥር ይጠቀሙ።', 'Checking...': 'እየተረጋገጠ ነው...', 'Create Your Account?': 'መለያ መፍጠር ይፈልጋሉ?', 'Already have an account?': 'መለያ አለዎት?', 'Remembered your password?': 'የይለፍ ቃልዎን አስታውሰዋል?', 'Sign up': 'መለያ ፍጠር', 'Full name and password are stored securely by the app server.': 'ሙሉ ስምዎ እና የይለፍ ቃልዎ በአፕ ሰርቨሩ በደህንነት ይጠበቃሉ።', 'Name': 'ስም', 'Phone': 'ስልክ', 'Expected': 'የሚጠበቀው', 'Fuel Fills': 'የነዳጅ መሙያዎች', 'Average Fill Cost': 'አማካይ የመሙያ ወጪ', 'No fuel records for this month.': 'ለዚህ ወር የነዳጅ መዝገብ የለም።', 'No fuel records for this period.': 'ለዚህ ጊዜ የነዳጅ መዝገብ የለም።', 'Off-Day': 'የእረፍት ቀን', 'Sunday/Custom': 'እሁድ/ተጨማሪ', 'custom off-days': 'ተጨማሪ የእረፍት ቀናት', 'Fuel Scheduling Rules': 'የነዳጅ መርሐ ግብር ደንቦች', 'Default Currency': 'ነባሪ ምንዛሬ', 'Save Settings': 'ቅንብሮችን አስቀምጥ', 'System Users': 'የስርዓት ተጠቃሚዎች',  'Add User': 'ተጠቃሚ ጨምር',
  'No new notifications': 'አዲስ ማሳወቂያ የለም',
  'Add Vehicle': 'ተሽከርካሪ ጨምር',
  'Remove Vehicle': 'ተሽከርካሪ አስወግድ',
  'Call': 'ደውል',
  'Back': 'ተመለስ',
  'Save': 'አስቀምጥ',
  'vehicles': 'ተሽከርካሪዎች',
  'Sundays excluded automatically': 'እሁዶች በራስ-ሰር ከሥራ ቀናት ይወገዳሉ',
  'Priority': 'ቅድሚያ',
  'Decision': 'ውሳኔ',
  'Expected Fuel Date': 'የሚጠበቀው የነዳጅ ቀን',
  'Fuel Priority — Management View': 'የነዳጅ ቅድሚያ — የአስተዳደር እይታ',
  'No vehicles in this priority filter': 'በዚህ የቅድሚያ ማጣሪያ ውስጥ ተሽከርካሪ የለም',
  'The system calculates and ranks priority. The manager makes the final fuel decision.': 'ስርዓቱ ቅድሚያን ያሰላ እና ደረጃ ይሰጣል። የመጨረሻውን የነዳጅ ውሳኔ አስተዳዳሪው ያደርጋል።',
  'Every fuel event, including early fills and manual overrides': 'ነዳጅ ሙላ እና በእጅ የተስተካከሉ ጨምሮ ሁሉም የነዳጅ ክስተቶች',
  'Reason / Approval': 'ምክንያት / ማጽደቂያ',
  'Excluded from working days': 'ከሥራ ቀናት ውስጥ የተወገደ',
  'Register the vehicle and define its fuel cycle in working days.': 'ተሽከርካሪውን ይመዝግቡ እና የነዳጅ ዙሩን በሥራ ቀናት ይወስኑ።',
  'Update the vehicle information without changing its existing fuel history.': 'የነዳጅ ታሪኩን ሳይቀይሩ የተሽከርካሪውን መረጃ ያስተካክሉ።',
  'Type': 'ዓይነት',
  'Fuel Cycle': 'የነዳጅ ዙር',
  'Fuel Fills': 'የነዳጅ መሙያዎች',
  'Average Fill Cost': 'አማካይ የመሙያ ወጪ',
  'No off-day records for this vehicle.': 'ለዚህ ተሽከርካሪ የእረፍት ቀን መዝገብ የለም።',
  'Vehicle notes...': 'የተሽከርካሪ ማስታወሻ...',
  'Vehicle under maintenance': 'ተሽከርካሪው በጥገና ላይ ነው',
  'Odometer': 'ኪሎሜትር መለኪያ',
  'Amount (ETB)': 'መጠን (ብር)',
  'Report Period': 'የሪፖርት ጊዜ',
  'Vehicles': 'ተሽከርካሪዎች',
  'Fuel Cost (ETB)': 'የነዳጅ ወጪ (ብር)',
  'Due Now': 'አሁን የሚሞላ',
  'Early / Override Events': 'ነዳጅ ሙላ / ማስተካከያ ክስተቶች',
  'Fuel Event Overview': 'የነዳጅ ክስተቶች አጠቃላይ እይታ',
  'ETB (Birr)': 'ብር',
  'USD': 'ዶላር',
  'Manager, Supervisor, Data Entry and Viewer access': 'የአስተዳዳሪ፣ ተቆጣጣሪ፣ የመረጃ መግቢያ እና የእይታ መዳረሻ',
  'New User Name': 'የአዲስ ተጠቃሚ ስም',
  'Employee name': 'የሰራተኛ ስም',
  'Role': 'ሚና',
  'Manager': 'አስተዳዳሪ',
  'Supervisor': 'ተቆጣጣሪ',
  'Data Entry': 'የመረጃ መግቢያ',
  'Viewer': 'ተመልካች',
  'Active': 'ንቁ',
  'Blocked': 'ታግዷል',
  'Action': 'ተግባር',
  'Save': 'አስቀምጥ',
  "Administrator action": "የአስተዳዳሪ ተግባር",
  "Already have an account?": "መለያ አስቀድሞ አለዎት?",
  "Checking...": "እየተፈተሸ ነው...",
  "Clear search": "ፍለጋን አጽዳ",
  "Confirm password": "የይለፍ ቃሉን አረጋግጥ",
  "Could not load recovery requests.": "የመለያ መመለሻ ጥያቄዎችን መጫን አልተቻለም።",
  "Could not reset the password.": "የይለፍ ቃሉን መቀየር አልተቻለም።",
  "Create Your Account": "መለያዎን ይፍጠሩ",
  "Create Your Account?": "መለያዎን ይፍጠሩ?",
  "Day Type": "የቀን ዓይነት",
  "Each vehicle is calculated separately. Total days follow the selected calendar month.": "እያንዳንዱ ተሽከርካሪ ለብቻው ይሰላል። ጠቅላላ ቀናት በተመረጠው የቀን መቁጠሪያ ወር መሠረት ይወሰናሉ።",
  "Edit Vehicle": "ተሽከርካሪ አርም",
  "Enter your full name": "ሙሉ ስምዎን ያስገቡ",
  "Enter your password": "የይለፍ ቃልዎን ያስገቡ",
  "Hide password": "የይለፍ ቃሉን ደብቅ",
  "Name": "ስም",
  "No dates in selected range.": "በተመረጠው የቀን ክልል ውስጥ ቀኖች የሉም።",
  "No fuel records for this period.": "ለዚህ ጊዜ የነዳጅ መዝገብ የለም።",
  "Off-Day": "የቀሪ ቀን",
  "Only requests from users in your organization are shown.": "የሚታዩት ከድርጅትዎ ተጠቃሚዎች የመጡ ጥያቄዎች ብቻ ናቸው።",
  "Password must be at least 8 characters.": "የይለፍ ቃሉ ቢያንስ 8 ቁምፊዎች መያዝ አለበት።",
  "Phone": "ስልክ",
  "Progress Start Date": "የሂደት መጀመሪያ ቀን",
  "Remaining Days Details": "የቀሩ ቀናት ዝርዝር",
  "Remaining Days at Start": "በመጀመሪያ የቀሩ ቀናት",
  "Remembered your password?": "የይለፍ ቃልዎን አስታውሰዋል?",
  "Requested": "ተጠይቋል",
  "Save Progress": "ሂደቱን አስቀምጥ",
  "Select a vehicle and a date on the calendar.": "ተሽከርካሪ እና በቀን መቁጠሪያው ላይ ቀን ይምረጡ።",
  "Set the known progress for the selected date. The app recalculates elapsed working days from that date through today, excluding Sundays and registered vehicle off-days.": "ለተመረጠው ቀን የሚታወቀውን ሂደት ያስገቡ። አፑ ከዚያ ቀን እስከ ዛሬ ያሉ የሥራ ቀናትን እሁዶችንና የተመዘገቡ የተሽከርካሪ ቀሪ ቀናትን በማስወገድ እንደገና ያሰላል።",
  "Show password": "የይለፍ ቃሉን አሳይ",
  "Sign up": "ተመዝገብ",
  "The new password must be 8–128 characters.": "አዲሱ የይለፍ ቃል ከ8 እስከ 128 ቁምፊዎች መሆን አለበት።",
  "This date will be excluded from the selected vehicle's working-day fuel cycle.": "ይህ ቀን ከተመረጠው ተሽከርካሪ የሥራ ቀን የነዳጅ ዙር ይወገዳል።",
  "Working Days Details": "የሥራ ቀናት ዝርዝር",
  "Working Days at Start": "በመጀመሪያ የሥራ ቀናት",
  "custom off-days": "ተጨማሪ የቀሪ ቀናት",
  "Something went wrong on this page.": "በዚህ ገጽ ላይ ችግር ተፈጥሯል።",
  "Return to Dashboard": "ወደ ዋና ገጽ ተመለስ",
  "omni-Fleet": "ኦምኒ-ፍሊት",
  "No fuel records for this month.": "ለዚህ ወር የነዳጅ መዝገብ የለም።",
  "OMNI Fleet Fuel Report": "የኦምኒ ፍሊት የነዳጅ ሪፖርት",
  "Remove": "አስወግድ",
  "No": "አይ",
  "Close": "ዝጋ",
  "Update Available": "አዲስ ስሪት አለ",
  "A new version of OMNI Fleet Fuel is available.": "አዲስ የኦምኒ ፍሊት ፊዩል ስሪት ዝግጁ ነው።",
  "Current version": "የአሁኑ ስሪት",
  "New version": "አዲስ ስሪት",
  "Later": "በኋላ",
  "Update Now": "አሁን አዘምን",
  "09XXXXXXXX or +2519XXXXXXXX": "09XXXXXXXX ወይም +2519XXXXXXXX",
};

const LanguageContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void; t: (value: string) => string }>({
  lang: 'en',
  setLang: () => undefined,
  t: value => value,
});

function useLanguage() {
  return useContext(LanguageContext);
}

type Vehicle = {
  id: number;
  code: string;
  name: string;
  phone: string;
  plate: string;
  type: string;
  fuel: string;
  cycle: number;
  branch: string;
  status: 'Active' | 'Maintenance';
  lastFilled: string;
  cycleDaysUsed?: number;
  cycleProgressStartDate?: string;
  notes?: string;
};

type FuelRecord = {
  id: number;
  date: string;
  time: string;
  plate: string;
  vehicle: string;
  odometer: number;
  amount: number;
  method: string;
  reason: string;
  timing: 'Normal (Due Date)' | 'Early Fill' | 'Manual Override';
  overrideReason?: string;
  approvedBy?: string;
};

type OffDay = {
  id: number;
  plate: string;
  date: string;
  reason: string;
  note: string;
};

type UserRecord = {
  id: number;
  name: string;
  role: string;
  status: 'Active' | 'Blocked';
};

type AppSettings = {
  currency: 'ETB (Birr)' | 'USD';
  sundayOff: boolean;
  customOffDays: boolean;
  requireManualApproval: boolean;
};

const defaultSettings: AppSettings = { currency: 'ETB (Birr)', sundayOff: true, customOffDays: true, requireManualApproval: true };

type VehicleState = Vehicle & {
  workingDays: number;
  remaining: number;
  expected: string;
  statusLabel: 'Due' | 'Near Due' | 'Safe';
};

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};
const gregorianToJdn = (year: number, month: number, day: number) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
};
const ethiopicMonths = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'];
const ethiopicToJdn = (year: number, month: number, day: number) => 1724221 + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day - 1;
const jdnToGregorian = (jdn: number) => {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(year, month - 1, day);
};
const toEthiopic = (value: Date) => {
  const jdn = gregorianToJdn(value.getFullYear(), value.getMonth() + 1, value.getDate());
  let year = value.getFullYear() - 8;
  while (ethiopicToJdn(year + 1, 1, 1) <= jdn) year += 1;
  while (ethiopicToJdn(year, 1, 1) > jdn) year -= 1;
  const dayOfYear = jdn - ethiopicToJdn(year, 1, 1);
  return { year, month: Math.floor(dayOfYear / 30) + 1, day: (dayOfYear % 30) + 1 };
};
const fromEthiopic = (year: number, month: number, day: number) => jdnToGregorian(ethiopicToJdn(year, month, day));
const formatDate = (value: string | Date) => {
  const d = typeof value === 'string' ? parseDate(value) : value;
  const isAmharic = localStorage.getItem('omni_ffm_lang') === 'am';
  if (isAmharic) {
    const eth = toEthiopic(d);
    return `${eth.day} ${ethiopicMonths[eth.month - 1]} ${eth.year} ዓ.ም.`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const formatMonthTitle = (value: Date) => {
  const isAmharic = localStorage.getItem('omni_ffm_lang') === 'am';
  if (isAmharic) {
    const eth = toEthiopic(value);
    return `${ethiopicMonths[eth.month - 1]} ${eth.year} ዓ.ም.`;
  }
  return value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
const formatTime = (value = new Date()) => {
  const locale = localStorage.getItem('omni_ffm_lang') === 'am' ? 'am-ET' : 'en-US';
  return value.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
};

const load = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};



function isWorkingDay(date: Date, plate: string, offDays: OffDay[], settings: AppSettings = defaultSettings) {
  if (settings.sundayOff && date.getDay() === 0) return false;
  return !offDays.some(o => o.plate === plate && o.date === dateKey(date));
}

function countWorkingDays(lastFilled: string, today: Date, plate: string, offDays: OffDay[], settings: AppSettings = defaultSettings) {
  const start = parseDate(lastFilled);
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  while (cursor <= end) {
    if (isWorkingDay(cursor, plate, offDays, settings)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function addWorkingDays(lastFilled: string, cycle: number, plate: string, offDays: OffDay[], settings: AppSettings = defaultSettings) {
  const cursor = parseDate(lastFilled);
  cursor.setHours(0, 0, 0, 0);
  let count = 0;
  if (isWorkingDay(cursor, plate, offDays, settings)) count = 1;
  while (count < cycle) {
    cursor.setDate(cursor.getDate() + 1);
    if (isWorkingDay(cursor, plate, offDays, settings)) count += 1;
  }
  return dateKey(cursor);
}

function deriveVehicle(vehicle: Vehicle, offDays: OffDay[], today = new Date(), settings: AppSettings = defaultSettings): VehicleState {
  const hasManualProgress = typeof vehicle.cycleDaysUsed === 'number' && !!vehicle.cycleProgressStartDate;
  const progressStart = vehicle.cycleProgressStartDate || vehicle.lastFilled;
  const progressStartDate = parseDate(progressStart);
  const manualElapsed = countWorkingDays(progressStart, today, vehicle.plate, offDays, settings) - (isWorkingDay(progressStartDate, vehicle.plate, offDays, settings) ? 1 : 0);
  const workingDays = hasManualProgress
    ? Math.max(0, (vehicle.cycleDaysUsed || 0) + manualElapsed)
    : countWorkingDays(vehicle.lastFilled, today, vehicle.plate, offDays, settings);
  const remaining = Math.max(vehicle.cycle - workingDays, 0);
  const expected = hasManualProgress
    ? (() => {
        const cursor = new Date(progressStartDate);
        let futureWorkingDays = Math.max(0, vehicle.cycle - (vehicle.cycleDaysUsed || 0));
        while (futureWorkingDays > 0) {
          cursor.setDate(cursor.getDate() + 1);
          if (isWorkingDay(cursor, vehicle.plate, offDays, settings)) futureWorkingDays -= 1;
        }
        return dateKey(cursor);
      })()
    : addWorkingDays(vehicle.lastFilled, vehicle.cycle, vehicle.plate, offDays, settings);
  return {
    ...vehicle,
    workingDays,
    remaining,
    expected,
    statusLabel: workingDays >= vehicle.cycle ? 'Due' : remaining <= 3 ? 'Near Due' : 'Safe',
  };
}

class PageErrorBoundary extends React.Component<React.PropsWithChildren<{ onRecover: () => void }>, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Page render error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state" role="alert">
          <AlertTriangle size={28} />
          <strong>{translateStatic("Something went wrong on this page.")}</strong>
          <button type="button" className="primary" onClick={this.props.onRecover}>{translateStatic("Return to Dashboard")}</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('omni_ffm_lang') as Lang) || 'en');

  return (
    <LanguageContext.Provider value={{ lang, setLang: value => {
      setLang(value);
      localStorage.setItem('omni_ffm_lang', value);
    }, t: value => lang === 'am' ? (translations[value] || value) : value }}>
      <><AppContent /><AppUpdateChecker /></>
    </LanguageContext.Provider>
  );
}

const reverseTranslations = Object.fromEntries(Object.entries(translations).map(([english, amharic]) => [amharic, english]));

const translateStatic = (value: string) => localStorage.getItem('omni_ffm_lang') === 'am' ? (translations[value] || value) : value;

function compareVersions(a: string, b: string) {
  const aa = a.replace(/^v/i, '').split('.').map(Number);
  const bb = b.replace(/^v/i, '').split('.').map(Number);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const diff = (aa[i] || 0) - (bb[i] || 0);
    if (diff) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function AppUpdateChecker() {
  const { t } = useLanguage();
  const [update, setUpdate] = useState<{ version: string; url: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('https://raw.githubusercontent.com/manchilotedu-alt/omni-fleet-fuel/migration/appdeploy-source/public/app-version.json?ts=' + Date.now(), { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Version check unavailable'); return response.json(); })
      .then((remote: { version?: string; releaseUrl?: string }) => {
        if (!active || !remote.version || compareVersions(remote.version, APP_VERSION) <= 0) return;
        setUpdate({ version: remote.version, url: remote.releaseUrl || 'https://github.com/manchilotedu-alt/omni-fleet-fuel/releases/latest' });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (!update || dismissed) return null;
  return <div className="update-overlay" role="dialog" aria-modal="true" aria-labelledby="update-title"><div className="update-dialog"><div className="update-brand-mark">OMNI</div><h2 id="update-title">{t('Update Available')}</h2><p>{t('A new version of OMNI Fleet Fuel is available.')}</p><p className="update-versions"><span>{t('Current version')}: {APP_VERSION}</span><span>{t('New version')}: {update.version}</span></p><div className="update-actions"><button type="button" className="outline" onClick={() => setDismissed(true)}>{t('Later')}</button><button type="button" className="primary" onClick={() => { void AppLauncher.openUrl({ url: update.url }); }}>{t('Update Now')}</button></div></div></div>;
}

function AppContent() {
  const { lang, setLang, t } = useLanguage();
  const [nightMode, setNightMode] = useState(() => localStorage.getItem('omni_ffm_night_mode') !== 'off');

  useEffect(() => {
    localStorage.setItem('omni_ffm_night_mode', nightMode ? 'on' : 'off');
  }, [nightMode]);

  // Translation is rendered through React's t() helper. Do not mutate React-managed DOM with a MutationObserver because external text/attribute changes can conflict with React reconciliation and cause page render failures.
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem('omni_ffm_biometric_enabled') === '1');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [active, setActive] = useState('Dashboard');
  const navigate = (page: string) => {
    if (page === active) return;
    setActive(page);
    window.history.pushState({ omniFleetPage: page }, '', window.location.href);
  };

  useEffect(() => {
    window.history.replaceState({ omniFleetPage: 'Dashboard' }, '', window.location.href);
    window.history.pushState({ omniFleetPage: 'Dashboard', rootGuard: true }, '', window.location.href);

    const handleBack = () => {
      const state = window.history.state as { omniFleetPage?: string; rootGuard?: boolean } | null;
      const page = state?.omniFleetPage;
      if (page) {
        setActive(page);
        if (page === 'Dashboard' && !state?.rootGuard) {
          window.history.pushState({ omniFleetPage: 'Dashboard', rootGuard: true }, '', window.location.href);
        }
        return;
      }
      setActive('Dashboard');
      window.history.pushState({ omniFleetPage: 'Dashboard', rootGuard: true }, '', window.location.href);
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, []);

  useEffect(() => {
    let listener: { remove: () => Promise<void> } | undefined;
    void CapacitorApp.addListener('backButton', () => {
      window.history.back();
    }).then(handle => { listener = handle; });
    return () => { void listener?.remove(); };
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    const recoveryLink = /type=recovery/.test(`${window.location.hash}${window.location.search}`);
    Promise.resolve().then(async () => {
      if (recoveryLink) {
        setPasswordRecovery(true);
        try {
          const { data } = await supabase.auth.getSession();
          if (mounted && data.session?.user) {
            const user = data.session.user;
            setAuthUser({ id: user.id, email: user.email || '', phone: user.phone || '', name: user.user_metadata?.full_name || user.phone || user.email || 'Fleet Manager' });
          }
        } catch {}
        return;
      }
      if (localStorage.getItem('omni_ffm_biometric_enabled') === '1') {
        try {
          if (!Capacitor.isNativePlatform()) throw new Error('Biometric authentication is available only in the installed mobile app.');
          const biometry = await BiometricAuth.checkBiometry();
          if (!biometry.isAvailable) throw new Error('Set up Face ID or fingerprint on your device first.');
          await BiometricAuth.authenticate({
            reason: 'Verify it is you to unlock Omni Fleet Fuel',
            cancelTitle: 'Use password',
            iosFallbackTitle: 'Use passcode',
            androidTitle: 'Unlock Omni Fleet Fuel',
            androidSubtitle: 'Verify it is you to continue',
            allowDeviceCredential: true,
            androidConfirmationRequired: false,
          });
          const response = await api.get('/api/auth/me');
          const user = response.data.user as AppUser;
          localStorage.setItem('omni_ffm_last_name', user.name || '');
          if (mounted) setAuthUser(user);
          return;
        } catch {
          if (mounted) setAuthUser(null);
          return;
        }
      }
      try {
        const response = await api.get('/api/auth/me');
        const user = response.data.user as AppUser;
        localStorage.setItem('omni_ffm_last_name', user.name || '');
        if (mounted) setAuthUser(user);
      } catch {
        sessionStorage.removeItem('omni_ffm_session_open');
        if (mounted) setAuthUser(null);
      }
    }).finally(() => {
      if (mounted) setAuthReady(true);
    });
    return () => { mounted = false; };
  }, []);

  const loggedIn = Boolean(authUser);

  useEffect(() => {
    if (!loggedIn) return;
    let active = true;
    const checkSession = async () => {
      try {
        const response = await api.get('/api/auth/me');
        const user = response.data.user as AppUser;
        if (active) setAuthUser(user);
      } catch {
        if (active) {
          localStorage.setItem('omni_ffm_last_name', authUser?.name || localStorage.getItem('omni_ffm_last_name') || '');
          setAuthUser(null);
          setShowMenu(false);
        }
      }
    };
    const interval = window.setInterval(checkSession, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [loggedIn, authUser?.name]);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => load<Vehicle[]>('omni_ffm_vehicles', []));
  const [fuel, setFuel] = useState<FuelRecord[]>(() => load<FuelRecord[]>('omni_ffm_fuel', []));
  const [offDays, setOffDays] = useState<OffDay[]>(() => load<OffDay[]>('omni_ffm_offdays', []));
  const [users, setUsers] = useState<UserRecord[]>(() => load<UserRecord[]>('omni_ffm_users', []));
  const [settings, setSettings] = useState<AppSettings>(() => load<AppSettings>('omni_ffm_settings', defaultSettings));
  const [dataReady, setDataReady] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [fuelPriorityFilter, setFuelPriorityFilter] = useState<'All' | 'Due' | 'Near Due' | 'Safe'>('All');
  const [search, setSearch] = useState('');
  const [homeSearch, setHomeSearch] = useState('');
  const [toast, setToast] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('omni_ffm_profile_photo') || '');

  useEffect(() => {
    if (!authUser?.id) {
      setDataReady(false);
      return;
    }
    let active = true;
    setDataReady(false);
    const readLegacyData = () => ({
      vehicles: load<Vehicle[]>('omni_ffm_vehicles', []),
      fuel: load<FuelRecord[]>('omni_ffm_fuel', []),
      offDays: load<OffDay[]>('omni_ffm_offdays', []),
      users: load<UserRecord[]>('omni_ffm_users', []),
      settings: load<AppSettings>('omni_ffm_settings', defaultSettings),
    });
    const applyData = (data: Record<string, unknown>) => {
      setVehicles(Array.isArray(data.vehicles) ? data.vehicles as Vehicle[] : []);
      setFuel(Array.isArray(data.fuel) ? data.fuel as FuelRecord[] : []);
      setOffDays(Array.isArray(data.offDays) ? data.offDays as OffDay[] : []);
      setUsers(Array.isArray(data.users) ? data.users as UserRecord[] : []);
      setSettings(data.settings && typeof data.settings === 'object' ? { ...defaultSettings, ...data.settings } as AppSettings : defaultSettings);
    };
    Promise.resolve().then(async () => {
      try {
        const response = await api.get('/api/fleet-data');
        const saved = response.data?.data || {};
        const hasSavedData = Object.keys(saved).length > 0;
        if (hasSavedData) {
          if (active) applyData(saved);
          return;
        }
        const legacyOwnerKey = 'omni_ffm_legacy_owner_v1';
        let legacyOwner = localStorage.getItem(legacyOwnerKey);
        if (!legacyOwner) {
          legacyOwner = authUser.id;
          localStorage.setItem(legacyOwnerKey, legacyOwner);
        }
        if (legacyOwner === authUser.id) {
          const legacy = readLegacyData();
          if (active) applyData(legacy);
          await api.put('/api/fleet-data', { data: legacy });
        } else if (active) {
          applyData({});
        }
      } catch (error) {
        console.error('Could not initialize account-specific fleet data.', error);
        if (active) applyData({});
      } finally {
        if (active) setDataReady(true);
      }
    });
    return () => { active = false; };
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id || !dataReady) return;
    api.put('/api/fleet-data', {
      data: { vehicles, fuel, offDays, users, settings },
    }).catch(error => console.error('Could not save account-specific fleet data.', error));
  }, [authUser?.id, dataReady, vehicles, fuel, offDays, users, settings]);
  useEffect(() => { if (profilePhoto) localStorage.setItem('omni_ffm_profile_photo', profilePhoto); else localStorage.removeItem('omni_ffm_profile_photo'); }, [profilePhoto]);

  const states = useMemo(() => vehicles.map(v => deriveVehicle(v, offDays, new Date(), settings)), [vehicles, offDays, settings]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };
  const toggleBiometric = async () => {
    if (biometricEnabled) {
      localStorage.removeItem('omni_ffm_biometric_enabled');
      setBiometricEnabled(false);
      notify('Biometric unlock disabled.');
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      notify('Biometric authentication is available only in the installed mobile app.');
      return;
    }
    try {
      const biometry = await BiometricAuth.checkBiometry();
      if (!biometry.isAvailable) {
        notify('Set up Face ID or fingerprint on your device first.');
        return;
      }
      await BiometricAuth.authenticate({
        reason: 'Confirm your identity to enable quick unlock',
        cancelTitle: 'Cancel',
        iosFallbackTitle: 'Use passcode',
        androidTitle: 'Enable biometric unlock',
        androidSubtitle: 'Confirm your identity to enable quick unlock',
        allowDeviceCredential: true,
        androidConfirmationRequired: false,
      });
      localStorage.setItem('omni_ffm_biometric_enabled', '1');
      setBiometricEnabled(true);
      notify('Biometric unlock enabled on this device.');
    } catch {
      notify('Biometric authentication was not completed. You can still sign in with your password.');
    }
  };
  const logout = async () => {
    if (authUser?.name) localStorage.setItem('omni_ffm_last_name', authUser.name);
    sessionStorage.removeItem('omni_ffm_session_open');
    localStorage.removeItem('omni_ffm_biometric_enabled');
    setBiometricEnabled(false);
    try { await api.post('/api/auth/logout'); } catch {} finally {
      setAuthUser(null);
      setShowMenu(false);
    }
  };
  const addVehicle = (vehicle: Vehicle) => {
    setVehicles(prev => [...prev, vehicle]);
    notify('Vehicle added successfully');
    navigate('Vehicle List');
  };
  const updateVehicle = (vehicle: Vehicle) => {
    setVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v));
    setSelected(vehicle);
    notify('Vehicle updated successfully');
    navigate('Vehicle Details');
  };
  const updateVehicleNote = (vehicleId: number, note: string) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, notes: note } : v));
    setSelected(prev => prev && prev.id === vehicleId ? { ...prev, notes: note } : prev);
    notify('Note saved');
  };
  const updateVehicleCycleProgress = (vehicleId: number, progress: { cycleDaysUsed: number; cycleProgressStartDate: string }) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, ...progress } : v));
    setSelected(prev => prev && prev.id === vehicleId ? { ...prev, ...progress } : prev);
    notify('Cycle progress saved; remaining days and expected fuel date recalculated');
  };
  const removeVehicle = (vehicle: Vehicle) => {
    const confirmed = window.confirm(t('Are you sure you want to remove this vehicle? Its fuel history and off-day records will also be removed.'));
    if (!confirmed) return;
    setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
    setFuel(prev => prev.filter(f => f.plate !== vehicle.plate));
    setOffDays(prev => prev.filter(o => o.plate !== vehicle.plate));
    setSelected(null);
    notify('Vehicle removed successfully');
    navigate('Vehicle List');
  };
  const addFuel = (record: FuelRecord, resetCycle = true) => {
    setFuel(prev => [record, ...prev]);
    if (resetCycle) {
      setVehicles(prev => prev.map(v => v.plate === record.plate ? { ...v, lastFilled: record.date, cycleDaysUsed: undefined, cycleProgressStartDate: undefined } : v));
    }
    notify(resetCycle ? 'Fuel filled and new cycle started' : 'Early fill recorded; normal cycle preserved');
    navigate('Filled Confirmation');
  };
  const addOffDay = (entries: OffDay[], stayOnCalendar = false) => {
    if (!entries.length) return;
    const uniqueEntries = entries.filter((entry, index, list) => list.findIndex(item => item.plate === entry.plate && item.date === entry.date) === index);
    if (!uniqueEntries.length) return;
    setOffDays(prev => {
      const incomingKeys = new Set(uniqueEntries.map(entry => `${entry.plate}|${entry.date}`));
      const withoutDuplicates = prev.filter(entry => !incomingKeys.has(`${entry.plate}|${entry.date}`));
      return [...uniqueEntries, ...withoutDuplicates];
    });
    notify(uniqueEntries.length === states.length ? 'Off-day applied to all vehicles' : 'Off-day saved; working-day calculations updated');
    if (!stayOnCalendar) navigate('Working Calendar');
  };
  const deleteOffDay = (plate: string, date: string) => {
    const targets = plate === '__ALL__' ? states.map(v => v.plate) : [plate];
    const targetSet = new Set(targets);
    if (!offDays.some(o => targetSet.has(o.plate) && o.date === date)) return;
    setOffDays(prev => prev.filter(o => !(targetSet.has(o.plate) && o.date === date)));
    notify(targets.length === states.length ? 'Off-day removed from all vehicles' : 'Off-day removed');
  };

  if (!authReady) {
    return <div className="auth-loading"><img className="auth-loading-logo" src="/omni-fleet-fuel-logo.svg" alt="OMNI Fleet Fuel" /><strong>{t('Checking secure session...')}</strong></div>;
  }

  if (!loggedIn || passwordRecovery) {
    return <Login initialRecovery={passwordRecovery} onRecoveryComplete={() => setPasswordRecovery(false)} lang={lang} setLang={setLang} onLogin={user => { localStorage.setItem('omni_ffm_last_name', user.name); sessionStorage.setItem('omni_ffm_session_open', '1'); setAuthUser(user); }} />;
  }

  if (!dataReady) {
    return <div className="auth-loading"><img className="auth-loading-logo" src="/omni-fleet-fuel-logo.svg" alt="OMNI Fleet Fuel" /><strong>{t('Checking secure session...')}</strong></div>;
  }

  const current = selected ? states.find(v => v.id === selected.id) ?? states[0] : states[0];
  const due = states.filter(v => v.statusLabel === 'Due' && v.status === 'Active').length;
  const near = states.filter(v => v.statusLabel === 'Near Due' && v.status === 'Active').length;
  const safe = states.filter(v => v.statusLabel === 'Safe' && v.status === 'Active').length;

  const pages: Record<string, React.ReactNode> = {
    Dashboard: <Dashboard states={states} due={due} near={near} safe={safe} search={homeSearch} setSearch={setHomeSearch} onNavigate={navigate} onSelect={v => { setSelected(v); navigate('Vehicle Details'); }} onCalendar={v => { setSelected(v); navigate('Working Calendar'); }} onStatusClick={status => { setFuelPriorityFilter(status); navigate(status === 'All' ? 'Vehicle List' : 'Fuel Priority'); }} />,
    'Vehicle List': <VehicleList states={states} search={search} setSearch={setSearch} onSelect={v => { setSelected(v); navigate('Vehicle Details'); }} onAdd={() => navigate('Add Vehicle')} onDelete={removeVehicle} />,
    'Add Vehicle': <AddVehicle nextId={vehicles.length + 1} onCancel={() => navigate('Vehicle List')} onSave={addVehicle} />,
    'Vehicle Details': current ? <VehicleDetails vehicle={current} fuel={fuel} offDays={offDays} settings={settings} onBack={() => navigate('Vehicle List')} onEdit={() => navigate('Edit Vehicle')} onFuel={() => navigate('Fuel Entry')} onEarly={() => navigate('Early Fill')} onOverride={() => navigate('Manual Override')} onOffDay={() => navigate('Add Off-Day')} onDelete={() => removeVehicle(current)} onSaveNote={updateVehicleNote} onSaveCycleProgress={updateVehicleCycleProgress} /> : null,
    'Edit Vehicle': current ? <EditVehicle vehicle={current} onCancel={() => navigate('Vehicle Details')} onSave={updateVehicle} /> : null,
    'Fuel Entry': <FuelEntry states={states} initialPlate={selected?.plate} onCancel={() => navigate('Dashboard')} onSave={r => addFuel(r, true)} />,
    'Early Fill': <EarlyFill states={states} onCancel={() => navigate('Dashboard')} onSave={r => addFuel(r, false)} />,
    'Manual Override': <ManualOverride states={states} onCancel={() => navigate('Dashboard')} onSave={r => addFuel(r, false)} />,
    'Filled Confirmation': <FilledConfirmation record={fuel[0]} onDone={() => navigate('Dashboard')} />,
    'Working Calendar': <WorkingCalendar states={states} offDays={offDays} initialPlate={selected?.plate} onSave={entries => addOffDay(entries, true)} onDelete={deleteOffDay} />,
    'Add Off-Day': <WorkingCalendar states={states} offDays={offDays} initialPlate={selected?.plate} onSave={entries => addOffDay(entries, true)} onDelete={deleteOffDay} />, 
    'Off-Day History': <OffDayHistory offDays={offDays} />,
    'Fuel Priority': <FuelPriority states={states} initialFilter={fuelPriorityFilter} onSelect={v => { setSelected(v); navigate('Vehicle Details'); }} />, 
    'Fuel History': <FuelHistory fuel={fuel} states={states} onSelect={v => { setSelected(v); navigate('Vehicle Details'); }} />,
    Reports: <><MonthlyFinanceBoard states={states} offDays={offDays} fuel={fuel} settings={settings} onSelect={v => { setSelected(v); navigate('Vehicle Details'); }} /><MonthlyReport fuel={fuel} states={states} onSelect={v => { setSelected(v); navigate('Vehicle Details'); }} /></>,
    Settings: <SettingsPage settings={settings} onSave={next => { setSettings(next); notify('Settings saved'); }} biometricEnabled={biometricEnabled} onToggleBiometric={toggleBiometric} />,
    'User Management': <UserManagement users={users} setUsers={setUsers} onNotify={notify} />,
    'Recovery Requests': <RecoveryRequestsPage onNotify={notify} />,
    'Access Controls': <AccessControlsPage onNotify={notify} />,
    Profile: <ProfilePage user={authUser} photo={profilePhoto} onPhotoChange={setProfilePhoto} onNavigate={navigate} onNotify={notify} />,
  };

  return (
    <div className={`app-shell ${nightMode ? 'night-mode' : 'day-mode'}`}>
      <header className="topbar">
        <div className="brand"><img className="brand-logo" src="/omni-fleet-fuel-logo.svg" alt="OMNI Fleet Fuel" /><div><strong>{translateStatic("omni-Fleet Fuel Monitoring")}</strong><span>{t('Fuel scheduling & manager decision support')}</span></div></div>
        <div className="top-actions">
          <button className="top-mode-toggle" type="button" onClick={() => setNightMode(v => !v)} aria-label={nightMode ? 'Turn off night mode' : 'Turn on night mode'} title={nightMode ? 'Turn off night mode' : 'Turn on night mode'}>{nightMode ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="language-toggle" type="button" onClick={() => setLang(lang === 'en' ? 'am' : 'en')} aria-label={lang === 'en' ? 'Switch to Amharic' : 'Switch to English'} title={lang === 'en' ? 'አማርኛ' : 'English'}>{lang === 'en' ? 'አማ' : 'EN'}</button>
          <button className="icon-btn" onClick={() => notify(t('No new notifications'))}><Bell size={19} /></button>
          <button className="user-pill" type="button" onClick={() => setShowMenu(v => !v)}>{profilePhoto ? <img className="avatar avatar-image" src={profilePhoto} alt="Profile" /> : <span className="avatar">{authUser?.name?.slice(0, 2).toUpperCase() || 'AD'}</span>}<span className="hide-sm">{authUser?.name || authUser?.phone || authUser?.email || t('Administrator')}</span><ChevronRight size={16} /></button>
          {showMenu && <div className="user-menu"><strong>{authUser?.name || t('Administrator')}</strong><small>{t('Fleet Manager')}</small><button type="button" onClick={() => { setShowMenu(false); navigate('Profile'); }}><UserCircle size={15} /> {t('Profile')}</button><button type="button" onClick={() => { setShowMenu(false); navigate('Settings'); }}><Settings size={15} /> {t('Settings')}</button><button type="button" onClick={() => { setShowMenu(false); notify(t('No new notifications')); }}><Bell size={15} /> {t('Notifications')}</button><button type="button" onClick={logout}><LogOut size={15} /> {t('Sign out')}</button></div>}
        </div>
      </header>
      <aside className="sidebar">
        <NavItem icon={<House />} label={t('Home')} active={active === 'Dashboard'} onClick={() => navigate('Dashboard')} />
        <NavItem icon={<Car />} label={t('Vehicle List')} active={active.includes('Vehicle') || active === 'Add Vehicle'} onClick={() => navigate('Vehicle List')} />
        <NavItem icon={<Fuel />} label={t('Fuel Entry')} active={['Fuel Entry', 'Early Fill', 'Manual Override'].includes(active)} onClick={() => navigate('Fuel Entry')} />
        <NavItem icon={<Gauge />} label={t('Fuel Priority')} active={active === 'Fuel Priority'} onClick={() => navigate('Fuel Priority')} />
        <NavItem icon={<CalendarDays />} label={t('Working Calendar')} active={['Working Calendar', 'Add Off-Day'].includes(active)} onClick={() => navigate('Working Calendar')} />
        <NavItem icon={<History />} label={t('Fuel History')} active={active === 'Fuel History'} onClick={() => navigate('Fuel History')} />
        <NavItem icon={<FileText />} label={t('Reports')} active={active === 'Reports'} onClick={() => navigate('Reports')} />
        <div className="nav-sep" />
        <NavItem icon={<UserCircle />} label={t('Profile')} active={active === 'Profile'} onClick={() => navigate('Profile')} />
        <NavItem icon={<Settings />} label={t('Settings')} active={active === 'Settings'} onClick={() => navigate('Settings')} />
        <NavItem icon={<UserCog />} label={t('User Management')} active={active === 'User Management'} onClick={() => navigate('User Management')} />
        <NavItem icon={<KeyRound />} label={t('Recovery Requests')} active={active === 'Recovery Requests'} onClick={() => navigate('Recovery Requests')} />
        <NavItem icon={<ShieldCheck />} label={t('Access Controls')} active={active === 'Access Controls'} onClick={() => navigate('Access Controls')} />
      </aside>
      <main className="main">
        <div className="page-head"><div><div className="crumb">{translateStatic("omni-Fleet")} <span>/</span> {t(active === 'Dashboard' ? 'Home' : active)}</div><h1>{t(active === 'Dashboard' ? 'Home' : active)}</h1></div><div className="head-actions">{active === 'Vehicle List' && <button className="primary" onClick={() => navigate('Add Vehicle')}><Plus size={17} /> Add Vehicle</button>}{active === 'Dashboard' && <button className="outline" onClick={() => navigate('Reports')}><FileText size={16} /> {t('View Report')}</button>}</div></div>
        <PageErrorBoundary key={active} onRecover={() => navigate('Dashboard')}>{pages[active]}</PageErrorBoundary>
      </main>
      <nav className="bottom-nav">
        <button className={active === 'Dashboard' ? 'active' : ''} onClick={() => navigate('Dashboard')}><House size={20} /><span>{t('Home')}</span></button>
        <button className={active.includes('Vehicle') || active === 'Add Vehicle' ? 'active' : ''} onClick={() => navigate('Vehicle List')}><Car size={20} /><span>{t('Vehicle List')}</span></button>
        <button className="bottom-add" onClick={() => navigate('Add Vehicle')} aria-label="Add Vehicle"><Plus size={24} /></button>
        <button className={active === 'Fuel Entry' ? 'active' : ''} onClick={() => navigate('Fuel Entry')}><Fuel size={20} /><span>{t('Fuel Entry')}</span></button>
        <button className={active === 'Reports' ? 'active' : ''} onClick={() => navigate('Reports')}><FileText size={20} /><span>{t('Reports')}</span></button>
      </nav>
      {toast && <div className="toast"><CheckCircle2 size={18} /> {toast}</div>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={'nav-item ' + (active ? 'active' : '')} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function Login({ onLogin, lang, setLang, initialRecovery = false, onRecoveryComplete }: { onLogin: (user: AppUser) => void; lang: Lang; setLang: (lang: Lang) => void; initialRecovery?: boolean; onRecoveryComplete: () => void }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryMother, setRecoveryMother] = useState('');
  const [recoveryBirthDate, setRecoveryBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    if (initialRecovery) { setResetMode(true); setErrorMessage(''); }
  }, [initialRecovery]);

  const handleError = (error: unknown, fallback: string) => {
    setNoticeMessage('');
    const e = error as { message?: string; response?: { status?: number; data?: { message?: string; error?: string; detail?: string } | string } };
    const data = e.response?.data;
    const serverMessage = typeof data === 'string' ? data : data?.message || data?.error || data?.detail;
    setErrorMessage(serverMessage && translations[serverMessage] ? t(serverMessage) : serverMessage || e.message || fallback);
  };

  const clearPasswordFields = () => { setPassword(''); setConfirm(''); };
  const switchMode = (next: 'login' | 'signup') => {
    setNoticeMessage(''); setResetMode(false); setMode(next); setName(''); setPhone(''); setMotherName(''); setFatherName(''); setBirthDate('');
    setRecoveryPhone(''); setRecoveryMother(''); setRecoveryBirthDate(''); clearPasswordFields(); setErrorMessage('');
  };
  const resetFlow = () => {
    setNoticeMessage(''); setResetMode(true); setRecoveryPhone(phone); setRecoveryMother(''); setRecoveryBirthDate(''); clearPasswordFields(); setErrorMessage('');
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setErrorMessage('');
    if (resetMode) {
      if (!recoveryPhone.trim() || !recoveryMother.trim() || !recoveryBirthDate) {
        setErrorMessage(t('Enter phone, mother name and birth date.'));
        return;
      }
      setBusy(true);
      try {
        const response = await api.post('/api/auth/recover-password', {
          phone: recoveryPhone.trim(), motherName: recoveryMother.trim(), birthDate: recoveryBirthDate,
        });
        setResetMode(false); setMode('login'); setPhone(recoveryPhone.trim()); clearPasswordFields();
        setRecoveryPhone(''); setRecoveryMother(''); setRecoveryBirthDate('');
        onRecoveryComplete();
        setNoticeMessage(t(response.data?.message || 'Your reset request has been recorded. Contact the administrator to complete the reset.'));
      } catch (error) {
        handleError(error, 'Password reset request failed.');
      } finally { setBusy(false); }
      return;
    }

    if (!phone.trim()) { setErrorMessage(t('Phone number is required.')); return; }
    if (password.length < 8) { setErrorMessage(t('Password must be at least 8 characters.')); return; }

    setBusy(true);
    try {
      if (mode === 'signup') {
        if (!name.trim() || !motherName.trim() || !fatherName.trim() || !birthDate) {
          setErrorMessage(t('Enter all required account information.'));
          return;
        }
        if (password !== confirm) { setErrorMessage(t('Passwords do not match.')); return; }
        const response = await api.post('/api/auth/signup', {
          name: name.trim(), phone: phone.trim(), motherName: motherName.trim(), fatherName: fatherName.trim(),
          birthDate, password, language: lang,
        });
        localStorage.setItem('omni_ffm_last_name', response.data.user.name);
        onLogin(response.data.user);
      } else {
        const response = await api.post('/api/auth/login', { phone: phone.trim(), password });
        localStorage.setItem('omni_ffm_last_name', response.data.user.name);
        onLogin(response.data.user);
      }
    } catch (error) {
      handleError(error, mode === 'signup' ? 'Could not create the account.' : 'Could not complete the request. Please try again.');
    } finally { setBusy(false); }
  };

  return <div className="login-page"><div className="login-glow login-glow-one" /><div className="login-glow login-glow-two" /><div className="login-shell"><div className="login-card">
    <div className="login-card-top"><button className="login-circle-btn" type="button" aria-label={t('Back')} onClick={() => window.history.back()}><ChevronLeft size={18} /></button><button className="login-circle-btn" type="button" onClick={() => setLang(lang === 'en' ? 'am' : 'en')}>{lang === 'en' ? 'አማ' : 'EN'}</button></div>
    <div className="login-logo-ring"><img className="login-logo-image" src="/omni-fleet-fuel-logo.svg" alt="OMNI Fleet Fuel" /></div>
    <div className="login-brand"><div className="login-welcome">{resetMode ? t('Request Password Reset') : mode === 'login' ? t('Welcome Back!') : t('Create Your Account')}</div><p>{resetMode ? t('Enter phone, mother name and birth date.') : mode === 'signup' ? t('Create an account with your phone number and recovery details.') : t('Sign in to manage fleet fuel scheduling')}</p></div>
    <form className="login-form" onSubmit={submit}>
      {!resetMode && mode === 'signup' && <>
        <label className="login-field"><span>{t('Full Name')}</span><div className="login-input-shell"><span className="login-input-icon">●</span><input value={name} onChange={e => setName(e.target.value)} type="text" placeholder={t('Enter your full name')} autoComplete="name" maxLength={120} required /></div></label>
        <label className="login-field"><span>{t('Phone Number')}</span><div className="login-input-shell"><span className="login-input-icon"><UserCircle size={16} /></span><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder={translateStatic("09XXXXXXXX or +2519XXXXXXXX")} autoComplete="tel" maxLength={20} required /></div></label>
        <label className="login-field"><span>{t("Mother's Full Name")}</span><div className="login-input-shell"><span className="login-input-icon">●</span><input value={motherName} onChange={e => setMotherName(e.target.value)} type="text" placeholder={t("Enter your mother's full name")} autoComplete="off" maxLength={120} required /></div></label>
        <label className="login-field"><span>{t("Father's Full Name")}</span><div className="login-input-shell"><span className="login-input-icon">●</span><input value={fatherName} onChange={e => setFatherName(e.target.value)} type="text" placeholder={t("Enter your father's full name")} autoComplete="off" maxLength={120} required /></div></label>
        <label className="login-field"><span>{t('Birth Date')}</span><div className="login-input-shell"><span className="login-input-icon"><CalendarDays size={16} /></span><input value={birthDate} onChange={e => setBirthDate(e.target.value)} type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} required /></div></label>
      </>}
      {!resetMode && mode === 'login' && <label className="login-field"><span>{t('Phone Number')}</span><div className="login-input-shell"><span className="login-input-icon"><UserCircle size={16} /></span><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="09XXXXXXXX or +2519XXXXXXXX" autoComplete="tel" maxLength={20} required /></div></label>}
      {resetMode && <>
        <label className="login-field"><span>{t('Phone Number')}</span><div className="login-input-shell"><span className="login-input-icon"><UserCircle size={16} /></span><input value={recoveryPhone} onChange={e => setRecoveryPhone(e.target.value)} type="tel" placeholder="09XXXXXXXX or +2519XXXXXXXX" autoComplete="tel" maxLength={20} required /></div></label>
        <label className="login-field"><span>{t("Mother's Full Name")}</span><div className="login-input-shell"><span className="login-input-icon">●</span><input value={recoveryMother} onChange={e => setRecoveryMother(e.target.value)} type="text" placeholder={t("Enter your mother's full name")} autoComplete="off" maxLength={120} required /></div></label>
        <label className="login-field"><span>{t('Birth Date')}</span><div className="login-input-shell"><span className="login-input-icon"><CalendarDays size={16} /></span><input value={recoveryBirthDate} onChange={e => setRecoveryBirthDate(e.target.value)} type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} required /></div></label>
      </>}
      {!resetMode && <label className="login-field"><span>{t('Password')}</span><div className="login-input-shell"><span className="login-input-icon">•</span><input value={password} onChange={e => setPassword(e.target.value)} type={passwordVisible ? 'text' : 'password'} placeholder={t('Enter your password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required /><button className="password-eye" type="button" aria-label={passwordVisible ? t('Hide password') : t('Show password')} onClick={() => setPasswordVisible(v => !v)}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>}
{!resetMode && mode === 'signup' && <label className="login-field"><span>{t('Confirm Password')}</span><div className="login-input-shell"><span className="login-input-icon">•</span><input value={confirm} onChange={e => setConfirm(e.target.value)} type={confirmVisible ? 'text' : 'password'} placeholder={t('Confirm password')} autoComplete="new-password" minLength={8} maxLength={128} required /><button className="password-eye" type="button" aria-label={confirmVisible ? t('Hide password') : t('Show password')} onClick={() => setConfirmVisible(v => !v)}>{confirmVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>}
      <div className="login-options">{!resetMode && mode === 'login' && <span className="login-create-label">{t('Use the phone number registered to this account.')}</span>}{!resetMode && mode === 'login' && <button className="login-link" type="button" disabled={busy} onClick={resetFlow}>{t('Forgot Password?')}</button>}</div>
      <button className="login-btn" type="submit" disabled={busy || (!resetMode && !phone.trim()) || (resetMode && (!recoveryPhone.trim() || !recoveryMother.trim() || !recoveryBirthDate)) || (!resetMode && password.length < 8) || (mode === 'signup' && (!name.trim() || !motherName.trim() || !fatherName.trim() || !birthDate || !confirm || password !== confirm))}><span>{busy ? t('Checking...') : resetMode ? t('Request Password Reset') : mode === 'login' ? t('Sign In') : t('Create Account')}</span><ChevronRight size={18} /></button>
      {errorMessage && <div className="login-error">{errorMessage}</div>}
      {noticeMessage && <div className="login-success" role="status">{noticeMessage}</div>}
      <div className="login-create"><span>{resetMode ? t('Remembered your password?') : mode === 'login' ? t('Create Your Account?') : t('Already have an account?')}</span><button type="button" className="login-link strong" onClick={() => resetMode ? switchMode('login') : switchMode(mode === 'login' ? 'signup' : 'login')}>{resetMode ? t('Sign In') : mode === 'login' ? t('Sign up') : t('Sign In')}</button></div>
    </form>
    <div className="login-secure-note"><CheckCircle2 size={15} /><span>{t('Your account information is stored securely by the app server.')}</span></div>
    <div className="login-language login-language-bottom"><button className={lang === 'am' ? 'selected-language' : ''} onClick={() => setLang('am')}>አማርኛ</button><span>·</span><button className={lang === 'en' ? 'selected-language' : ''} onClick={() => setLang('en')}>{translateStatic("English")}</button></div>
  </div><div className="login-brand-mark"><span className="login-brand-dot"><Fuel size={16} /></span><strong>{translateStatic("omni-Fleet")}</strong></div></div></div>;
}

function Dashboard({ states, due, near, safe, search, setSearch, onNavigate, onSelect, onCalendar, onStatusClick }: { states: VehicleState[]; due: number; near: number; safe: number; search: string; setSearch: (value: string) => void; onNavigate: (p: string) => void; onSelect: (v: Vehicle) => void; onCalendar: (v: Vehicle) => void; onStatusClick: (status: 'Due' | 'Near Due' | 'Safe' | 'All') => void }) {
  const { t } = useLanguage();
  const today = new Date();
  const query = search.trim().toLocaleLowerCase();
  const searchResults = query ? states.filter(v => [v.name, v.code, v.plate, v.phone, v.branch, v.type, v.fuel].some(value => String(value || '').toLocaleLowerCase().includes(query))).slice(0, 6) : [];
  return <div className="content"><div className="home-search-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}><div className="workday"><CalendarDays size={17} /> <strong>{formatDate(today)}</strong><span>{t(today.getDay() === 0 ? 'Sunday — Default Off-Day' : 'Working Day')}</span></div><div className="home-vehicle-search" style={{ flex: '1 1 280px', minWidth: 240, position: 'relative' }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 12px', border: '1px solid var(--border, rgba(255,255,255,.16))', borderRadius: 12, background: 'var(--card, #111714)', color: 'var(--text, #fff)' }}><Search size={18} /><input aria-label={t('Search by name, plate, phone or branch')} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search by name, plate, phone or branch')} style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'inherit' }} /><button type="button" className="icon-btn" aria-label={t('Clear search')} onClick={() => setSearch('')} style={{ display: search ? 'inline-flex' : 'none' }}><X size={16} /></button></label>{query && <div role="listbox" aria-label={t('Find Vehicle')} style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border, rgba(255,255,255,.16))', borderRadius: 12, background: 'var(--card, #111714)', boxShadow: '0 14px 35px rgba(0,0,0,.24)' }}>{searchResults.length ? searchResults.map(v => <button key={v.id} type="button" role="option" onClick={() => { setSearch(''); onSelect(v); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 3, width: '100%', padding: '11px 13px', textAlign: 'left', border: 0, borderBottom: '1px solid var(--border, rgba(255,255,255,.1))', background: 'transparent', color: 'inherit', cursor: 'pointer' }}><strong>{v.type || t('Vehicle')} · {v.plate}</strong><span style={{ fontSize: 12, opacity: .75 }}>{v.name || t('Contact Name')} · {v.phone || t('Phone')} · {v.branch || '—'}</span></button>) : <div style={{ padding: 14, fontSize: 13, opacity: .75 }}>{t('No matching vehicles found.')}</div>}</div>}</div></div><div className="alert"><AlertTriangle size={21} /><div><strong>{due} {t('vehicles are due for fuel')}</strong><small>{t('Priority is calculated from working days, fuel cycle and registered off-days.')}</small></div><button type="button" onClick={() => onNavigate('Fuel Priority')}>{t('Review Priority')} <ChevronRight size={16} /></button></div><div className="stat-grid"><Stat icon={<Fuel />} label={t('Due Today')} value={due} tone="red" onClick={() => onStatusClick('Due')} /><Stat icon={<Clock3 />} label={t('Near Due')} value={near} tone="amber" onClick={() => onStatusClick('Near Due')} /><Stat icon={<CheckCircle2 />} label={t('Safe')} value={safe} tone="green" onClick={() => onStatusClick('Safe')} /><Stat icon={<Car />} label={t('Total Vehicles')} value={states.length} tone="blue" onClick={() => onStatusClick('All')} /></div><div className="section-title"><h2>{t('Manager Decision Support')}</h2></div><div className="quick-grid"><Quick icon={<Fuel />} label={t('Record Fuel')} onClick={() => onNavigate('Fuel Entry')} /><Quick icon={<Gauge />} label={t('Fuel Priority')} onClick={() => onNavigate('Fuel Priority')} /><Quick icon={<Wrench />} label={t('Add Off-Day')} onClick={() => onNavigate('Working Calendar')} /><Quick icon={<Car />} label={t('Find Vehicle')} onClick={() => onNavigate('Vehicle List')} /><Quick icon={<FileText />} label={t('Reports')} onClick={() => onNavigate('Reports')} /></div><div className="section-title row-between"><h2>{t("Today's Fuel Priority")}</h2><button className="link-btn" onClick={() => onNavigate('Fuel Priority')}>{t('View all')} <ChevronRight size={15} /></button></div><div className="table-card"><table><thead><tr><th>#</th><th>{t('Vehicle')}</th><th>{t('Name')}</th><th>{t('Phone')}</th><th>{t('Plate')}</th><th>{t('Working Days')}</th><th>{t('Days Remaining')}</th><th>{t('Expected Fuel')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead><tbody>{[...states.filter(v => v.status === 'Active')].sort(prioritySort).slice(0, 6).map((v, i) => <tr key={v.id}><td>{i + 1}</td><td><strong>{v.code}</strong></td><td><button type="button" className="link-btn vehicle-name-link" onClick={() => onSelect(v)}>{v.name}</button></td><td><a className="phone-link" href={`tel:${v.phone}`} aria-label={`${t('Call')} ${v.phone}`}>{v.phone}</a></td><td>{v.plate}</td><td>{v.workingDays}/{v.cycle}</td><td><button type="button" className="link-btn" onClick={() => onCalendar(v)}>{v.remaining}</button></td><td>{formatDate(v.expected)}</td><td><Status state={v} /></td><td><button className="small-btn" onClick={() => onSelect(v)}>{t('Details')}</button></td></tr>)}</tbody></table></div></div>;
}

function prioritySort(a: VehicleState, b: VehicleState) {
  return (a.remaining - b.remaining) || (b.workingDays - a.workingDays);
}
function Stat({ icon, label, value, tone, onClick }: { icon: React.ReactNode; label: string; value: number; tone: string; onClick?: () => void }) { const content = <><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value.toLocaleString()}</strong></div></>; return onClick ? <button type="button" className={'stat ' + tone + ' stat-clickable'} onClick={onClick} aria-label={`${label}: ${value.toLocaleString()}`}>{content}</button> : <div className={'stat ' + tone}>{content}</div>; }
function Quick({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) { return <button className="quick" onClick={onClick}>{icon}<span>{label}</span><ChevronRight size={15} /></button>; }
function Status({ state }: { state: VehicleState }) { const { t } = useLanguage(); return <span className={'status ' + (state.statusLabel === 'Due' ? 'due' : state.statusLabel === 'Near Due' ? 'near' : 'safe')}>{t(state.statusLabel)}</span>; }

function VehicleList({ states, search, setSearch, onSelect, onAdd, onDelete }: { states: VehicleState[]; search: string; setSearch: (v: string) => void; onSelect: (v: Vehicle) => void; onAdd: () => void; onDelete: (v: Vehicle) => void }) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'All' | 'Due' | 'Near Due' | 'Safe'>('All');
  const searched = states.filter(v => `${v.name} ${v.phone} ${v.plate} ${v.code} ${v.type} ${v.branch}`.toLowerCase().includes(search.toLowerCase()));
  const counts = {
    All: states.length,
    Due: states.filter(v => v.statusLabel === 'Due').length,
    'Near Due': states.filter(v => v.statusLabel === 'Near Due').length,
    Safe: states.filter(v => v.statusLabel === 'Safe').length,
  };
  const filtered = filter === 'All' ? searched : searched.filter(v => v.statusLabel === filter);
  const filters: Array<{ key: 'All' | 'Due' | 'Near Due' | 'Safe'; label: string; tone: string }> = [
    { key: 'All', label: 'All', tone: 'all' },
    { key: 'Due', label: 'Due', tone: 'red' },
    { key: 'Near Due', label: 'Near Due', tone: 'amber' },
    { key: 'Safe', label: 'Safe', tone: 'green' },
  ];
  return <div className="content"><div className="filterbar"><div className="search"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search by name or phone')} /></div><button type="button" className="primary" onClick={onAdd}><Plus size={17} /> {t('Add Vehicle')}</button></div><div className="chips">{filters.map(item => <button type="button" key={item.key} className={'chip ' + item.tone + (filter === item.key ? ' chip-active' : '')} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{t(item.label)} ({counts[item.key]})</button>)}</div><div className="table-card"><table><thead><tr><th>#</th><th>{t('Vehicle')}</th><th>{t('Name')}</th><th>{t('Phone')}</th><th>{t('Plate')}</th><th>{t('Fuel')}</th><th>{t('Cycle')}</th><th>{t('Working Days')}</th><th>{t('Expected')}</th><th>{t('Status')}</th><th>{t('Action')}</th></tr></thead><tbody>{filtered.length ? filtered.map((v, i) => <tr key={v.id}><td>{i + 1}</td><td><strong>{v.code}</strong><div className="muted">{v.type} · {v.branch}</div></td><td><button type="button" className="link-btn vehicle-name-link" onClick={() => onSelect(v)}>{v.name || t('No name')}</button></td><td><a className="phone-link" href={`tel:${v.phone}`} aria-label={`${t('Call')} ${v.phone}`}>{v.phone}</a></td><td>{v.plate}</td><td>{v.fuel}</td><td>{v.cycle} {t('days')}</td><td>{v.workingDays}/{v.cycle}</td><td>{formatDate(v.expected)}</td><td><button type="button" className="status-button" onClick={() => onSelect(v)}><Status state={v} /></button></td><td><button type="button" className="small-btn" onClick={() => onSelect(v)}>{t('Details')}</button> <button type="button" className="icon-btn danger-action" aria-label="Remove Vehicle" title="Remove Vehicle" onClick={() => onDelete(v)}><X size={16} /></button></td></tr>) : <tr><td colSpan={11} className="empty-state">{t('No vehicles in this priority filter')}</td></tr>}</tbody></table></div></div>;
}

function AddVehicle({ nextId, onCancel, onSave }: { nextId: number; onCancel: () => void; onSave: (v: Vehicle) => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState(`እቃ ${nextId}`);
  const [plate, setPlate] = useState('');
  const [type, setType] = useState('Isuzu');
  const [fuel, setFuel] = useState('Diesel');
  const [cycle, setCycle] = useState('10');
  const [branch, setBranch] = useState('ዋና መስሪያ ቤት');
  const [lastFilled, setLastFilled] = useState(dateKey(new Date()));
  const [cycleDaysUsed, setCycleDaysUsed] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const branches = ['ልደታ/ኮልፌ', 'ጉለሌ/አዲስ ከተማ', 'ንፋስ ስልክ/ቃሊቲ', 'ዋና መስሪያ ቤት'];
  const manualProgress = cycleDaysUsed.trim() !== '' ? Math.min(Math.max(1, Number(cycleDaysUsed) || 1), Math.max(5, Number(cycle) || 5)) : undefined;
  return <FormShell title={t('Add Vehicle')} subtitle={t('Register the vehicle and define its fuel cycle in working days.')} onCancel={onCancel} onSubmit={() => plate.trim() && name.trim() && phone.trim() && onSave({ id: Date.now(), code, name: name.trim(), phone: phone.trim(), plate: plate.trim(), type, fuel, cycle: Math.max(5, Number(cycle) || 5), branch, status: 'Active', lastFilled, ...(manualProgress !== undefined ? { cycleDaysUsed: manualProgress, cycleProgressStartDate: dateKey(new Date()) } : {}) })} submitLabel={t('Save Vehicle')}><Field label={t('Vehicle Code')} value={code} onChange={setCode} /><Field label={t('Contact Name')} value={name} onChange={setName} placeholder={t('Full Name')} /><Field label={t('Phone Number')} value={phone} onChange={v => setPhone(v.replace(/[^0-9+]/g, ''))} placeholder="09XXXXXXXX" type="tel" /><Field label={t('Plate Number')} value={plate} onChange={setPlate} placeholder="A12345" /><SelectField label={t('Vehicle Type')} value={type} onChange={setType} options={['Isuzu', 'Dolphin', 'Fifiel', 'Hysi', 'Pickup', 'Vitz', 'Other']} /><SelectField label={t('Fuel Type')} value={fuel} onChange={setFuel} options={['Diesel', 'Petrol']} /><Field label={t('Fuel Cycle (Working Days)')} value={cycle} onChange={setCycle} type="number" min={5} step={1} /><SelectField label={t('Branch')} value={branch} onChange={setBranch} options={branches} /><Field label={t('Last Filled Date')} value={lastFilled} onChange={setLastFilled} type="date" /><Field label={t('Working Days Already Used (optional)')} value={cycleDaysUsed} onChange={setCycleDaysUsed} type="number" min={1} max={Math.max(5, Number(cycle) || 5)} step={1} /><p className="form-hint">{t('Leave blank to calculate from Last Filled Date. Enter the current progress if the cycle started before using this app.')}</p></FormShell>;
}

function VehicleDetails({ vehicle, fuel, offDays, settings, onBack, onEdit, onFuel, onEarly, onOverride, onOffDay, onDelete, onSaveNote, onSaveCycleProgress }: { vehicle: VehicleState; fuel: FuelRecord[]; offDays: OffDay[]; settings: AppSettings; onBack: () => void; onEdit: () => void; onFuel: () => void; onEarly: () => void; onOverride: () => void; onOffDay: () => void; onDelete: () => void; onSaveNote: (vehicleId: number, note: string) => void; onSaveCycleProgress: (vehicleId: number, progress: { cycleDaysUsed: number; cycleProgressStartDate: string }) => void }) {
  const { t } = useLanguage();
  const [cyclePanel, setCyclePanel] = useState<'working' | 'remaining' | null>(null);
  const [tab, setTab] = useState<'Overview' | 'Fuel History' | 'Off-Days' | 'Notes'>('Overview');
  const [month, setMonth] = useState(dateKey(new Date()).slice(0, 7));
  const [note, setNote] = useState(vehicle.notes || '');
  useEffect(() => setNote(vehicle.notes || ''), [vehicle.id, vehicle.notes]);
  const vehicleOffDays = offDays.filter(o => o.plate === vehicle.plate);
  const vehicleFuel = fuel.filter(f => f.plate === vehicle.plate);
  const monthFuel = vehicleFuel.filter(f => f.date.slice(0, 7) === month);
  const monthTotal = monthFuel.reduce((sum, f) => sum + f.amount, 0);
  const monthAverage = monthFuel.length ? monthTotal / monthFuel.length : 0;
  const monthWorkedDays = (() => {
    const start = parseDate(`${month}-01`);
    const today = new Date();
    const end = month === dateKey(today).slice(0, 7) ? today : new Date(start.getFullYear(), start.getMonth() + 1, 0);
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = dateKey(d);
      const sunday = d.getDay() === 0;
      const customOff = vehicleOffDays.some(o => o.date === key);
      const workedSunday = sunday && monthFuel.some(f => f.date === key);
      if ((!sunday || workedSunday) && !customOff) count += 1;
    }
    return Math.min(30, count);
  })();
  const monthRemainingDays = Math.max(0, 30 - monthWorkedDays);
  const monthOffDays = vehicleOffDays.filter(o => o.date.slice(0, 7) === month).length;
  const saveNote = () => onSaveNote(vehicle.id, note);
  return <div className="content"><button className="back-btn" onClick={onBack}><ChevronLeft size={18} /> {translateStatic("Back to vehicles")}</button><div className="detail-card"><div className="detail-hero"><div className="large-car"><Car size={72} /></div><div><span className="eyebrow">{vehicle.code}</span><h2>{vehicle.plate}</h2><p>{vehicle.name} · {vehicle.type} · {vehicle.fuel} · {vehicle.branch}</p><a className="phone-link detail-phone" href={`tel:${vehicle.phone}`}>{vehicle.phone}</a></div><div className="detail-hero-actions"><button className="outline edit" onClick={onEdit}><Edit3 size={15} /> {t('Edit')}</button><button className="outline danger-action" onClick={onDelete}><X size={15} /> {t('Remove Vehicle')}</button></div></div><div className="tabs">{(['Overview','Fuel History','Off-Days','Notes'] as const).map(item => <button key={item} type="button" className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{t(item)}</button>)}</div>{tab === 'Overview' && <><div className="detail-grid"><Info label="Contact Name" value={vehicle.name} /><Info label="Phone Number" value={vehicle.phone} /><Info label="Plate Number" value={vehicle.plate} /><Info label="Type" value={vehicle.type} /><Info label="Fuel Type" value={vehicle.fuel} /><Info label="Fuel Cycle" value={`${vehicle.cycle} Working Days`} /><Info label="Working Days" value={`${vehicle.workingDays} / ${vehicle.cycle}`} /><Info label="Expected Next Fuel" value={formatDate(vehicle.expected)} /></div><div className="detail-tab-panel monthly-overview-summary"><div className="month-selector"><label>{t('Monthly')}<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label></div><div className="report-stats detail-stats"><Stat icon={<Fuel />} label={t('Fuel Fills')} value={monthFuel.length} tone="blue" /><Stat icon={<CircleDollarSign />} label={t('Fuel Cost (ETB)')} value={monthTotal} tone="green" /><Stat icon={<CalendarDays />} label={t('Scheduled Working Days')} value={monthWorkedDays} tone="amber" /><Stat icon={<CalendarDays />} label={t('Recorded Off-Days')} value={monthOffDays} tone="red" /></div></div><div className="report-stats detail-stats detail-month-summary"><Stat icon={<CalendarDays />} label={t('Entered Days')} value={vehicle.workingDays} tone="blue" onClick={() => setCyclePanel('working')} /><Stat icon={<Clock3 />} label={t('Remaining Days')} value={vehicle.remaining} tone="amber" onClick={() => setCyclePanel('remaining')} /></div><div className="cycle-box"><div><span>{translateStatic("Last Filled")}</span><strong>{formatDate(vehicle.lastFilled)}</strong></div><div><span>{translateStatic("Working Days")}</span><button type="button" className="link-btn" onClick={() => setCyclePanel('working')}>{vehicle.workingDays} / {vehicle.cycle}</button></div><div><span>{translateStatic("Days Remaining")}</span><button type="button" className="link-btn" onClick={() => setCyclePanel('remaining')}>{vehicle.remaining}</button></div><div><span>{translateStatic("Expected Date")}</span><strong>{formatDate(vehicle.expected)}</strong></div><Status state={vehicle} /></div><div className="detail-actions"><button className="primary" onClick={onFuel}><Fuel size={17} /> {t('Fuel Due')}</button><button className="outline" onClick={onEarly}><Clock3 size={17} /> {t('Early Fill')}</button><button className="outline" onClick={onOverride}><AlertTriangle size={17} /> {t('Manual Override')}</button><button className="outline" onClick={onOffDay}><CalendarDays size={17} /> {t('Add Off-Day')}</button></div></>}{tab === 'Fuel History' && <div className="detail-tab-panel"><div className="month-selector"><label>{t('Monthly')}<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label></div><div className="report-stats detail-stats"><Stat icon={<CircleDollarSign />} label={t('Fuel Cost (ETB)')} value={monthTotal} tone="green" /><Stat icon={<Fuel />} label="Fuel Fills" value={monthFuel.length} tone="blue" /><Stat icon={<CircleDollarSign />} label="Average Fill Cost" value={Math.round(monthAverage)} tone="amber" /></div><div className="table-card"><table><thead><tr><th>#</th><th>{t('Date')}</th><th>{t('Time')}</th><th>{t('Amount')}</th><th>{t('Payment Method')}</th><th>{t('Timing')}</th></tr></thead><tbody>{monthFuel.length ? monthFuel.map((f, i) => <tr key={f.id}><td>{i + 1}</td><td>{formatDate(f.date)}</td><td>{f.time}</td><td>{f.amount.toLocaleString()} ETB</td><td>{t(f.method)}</td><td>{t(f.timing)}</td></tr>) : <tr><td colSpan={6} className="empty-state">{translateStatic("No fuel records for this month.")}</td></tr>}</tbody></table></div></div>}{tab === 'Off-Days' && <div className="detail-tab-panel"><div className="section-title row-between"><h2>{t('Off-Days')}</h2><button className="primary" onClick={onOffDay}><Plus size={16} /> {t('Add Off-Day')}</button></div><div className="table-card"><table><thead><tr><th>#</th><th>{t('Date')}</th><th>{t('Reason')}</th><th>{t('Note')}</th></tr></thead><tbody>{vehicleOffDays.length ? vehicleOffDays.map((o, i) => <tr key={o.id}><td>{i + 1}</td><td>{formatDate(o.date)}</td><td>{t(o.reason)}</td><td>{o.note}</td></tr>) : <tr><td colSpan={4} className="empty-state">No off-day records for this vehicle.</td></tr>}</tbody></table></div></div>}{tab === 'Notes' && <div className="detail-tab-panel"><div className="field"><span>{t('Notes')}</span><textarea className="notes-area" value={note} onChange={e => setNote(e.target.value)} placeholder={translateStatic("Vehicle notes...")} /></div><div className="form-actions"><button className="primary" onClick={saveNote}>{t('Save')}</button></div></div>}</div>{cyclePanel && <CycleProgressPanel vehicle={vehicle} offDays={offDays} settings={settings} mode={cyclePanel} onClose={() => setCyclePanel(null)} onSave={progress => { onSaveCycleProgress(vehicle.id, progress); setCyclePanel(null); }} />}</div>;
}

function CycleProgressPanel({ vehicle, offDays, settings, mode, onClose, onSave }: { vehicle: VehicleState; offDays: OffDay[]; settings: AppSettings; mode: 'working' | 'remaining'; onClose: () => void; onSave: (progress: { cycleDaysUsed: number; cycleProgressStartDate: string }) => void }) {
  const { t } = useLanguage();
  const [baselineDate, setBaselineDate] = useState(dateKey(new Date()));
  const [remainingInput, setRemainingInput] = useState(String(vehicle.remaining));
  const [workingInput, setWorkingInput] = useState(String(vehicle.workingDays));
  const todayKey = dateKey(new Date());
  const safeRemaining = Math.min(vehicle.cycle, Math.max(0, Number(remainingInput) || 0));
  const safeWorking = Math.min(vehicle.cycle, Math.max(0, Number(workingInput) || 0));
  const baselineUsed = mode === 'remaining' ? vehicle.cycle - safeRemaining : safeWorking;
  const days: { date: string; label: string; working: boolean; progress: number }[] = [];
  const start = parseDate(baselineDate);
  const end = parseDate(todayKey);
  let progress = baselineUsed;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d);
    const working = isWorkingDay(d, vehicle.plate, offDays, settings);
    if (key !== baselineDate && working) progress += 1;
    days.push({ date: key, label: formatDate(key), working, progress });
  }
  return <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}><div style={{ background: 'var(--card, #fff)', color: 'var(--text, #172033)', borderRadius: 16, padding: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}><div className="section-title row-between"><div><h2>{mode === 'working' ? t('Working Days Details') : t('Remaining Days Details')}</h2><p className="muted">{vehicle.name} · {vehicle.plate} · {t('Fuel Cycle')}: {vehicle.cycle}</p></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="form-grid"><Field label={t('Progress Start Date')} value={baselineDate} onChange={setBaselineDate} type="date" /><Field label={mode === 'working' ? t('Working Days at Start') : t('Remaining Days at Start')} value={mode === 'working' ? workingInput : remainingInput} onChange={mode === 'working' ? setWorkingInput : setRemainingInput} type="number" min={0} max={vehicle.cycle} /></div><p className="form-hint">{t('Set the known progress for the selected date. The app recalculates elapsed working days from that date through today, excluding Sundays and registered vehicle off-days.')}</p><div className="table-card"><table><thead><tr><th>{t('Date')}</th><th>{t('Day Type')}</th><th>{t('Working Days')}</th><th>{t('Remaining Days')}</th></tr></thead><tbody>{days.length ? days.map(day => <tr key={day.date}><td>{day.label}</td><td>{day.working ? t('Working Day') : t('Off-Day')}</td><td>{day.progress} / {vehicle.cycle}</td><td>{Math.max(0, vehicle.cycle - day.progress)}</td></tr>) : <tr><td colSpan={4}>{t('No dates in selected range.')}</td></tr>}</tbody></table></div><div className="form-actions"><button type="button" className="outline" onClick={onClose}>{t('Cancel')}</button><button type="button" className="primary" onClick={() => onSave({ cycleDaysUsed: baselineUsed, cycleProgressStartDate: baselineDate })}>{t('Save Progress')}</button></div></div></div>;
}

function EditVehicle({ vehicle, onCancel, onSave }: { vehicle: VehicleState; onCancel: () => void; onSave: (v: Vehicle) => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState(vehicle.code);
  const [name, setName] = useState(vehicle.name);
  const [phone, setPhone] = useState(vehicle.phone);
  const [plate, setPlate] = useState(vehicle.plate);
  const [type, setType] = useState(vehicle.type);
  const [fuel, setFuel] = useState(vehicle.fuel);
  const [cycle, setCycle] = useState(String(vehicle.cycle));
  const [lastFilled, setLastFilled] = useState(vehicle.lastFilled);
  const branches = ['ልደታ/ኮልፌ', 'ጉለሌ/አዲስ ከተማ', 'ንፋስ ስልክ/ቃሊቲ', 'ዋና መስሪያ ቤት'];
  const [branch, setBranch] = useState(branches.includes(vehicle.branch) ? vehicle.branch : vehicle.branch === 'Head Office' ? 'ዋና መስሪያ ቤት' : branches[0]);
  return <FormShell title={t('Edit Vehicle')} subtitle={t('Update the vehicle information without changing its existing fuel history.')} onCancel={onCancel} onSubmit={() => onSave({ ...vehicle, code, name: name.trim(), phone: phone.trim(), plate: plate.trim(), type, fuel, cycle: Math.max(5, Number(cycle) || 5), branch, lastFilled })} submitLabel={t('Save')}><Field label={t('Vehicle Code')} value={code} onChange={setCode} /><Field label={t('Contact Name')} value={name} onChange={setName} /><Field label={t('Phone Number')} value={phone} onChange={v => setPhone(v.replace(/[^0-9+]/g, ''))} type="tel" /><Field label={t('Plate Number')} value={plate} onChange={setPlate} /><SelectField label={t('Vehicle Type')} value={type} onChange={setType} options={['Isuzu', 'Dolphin', 'Fifiel', 'Hysi', 'Pickup', 'Vitz', 'Other']} /><SelectField label={t('Fuel Type')} value={fuel} onChange={setFuel} options={['Diesel', 'Petrol']} /><Field label={t('Fuel Cycle (Working Days)')} value={cycle} onChange={setCycle} type="number" min={5} step={1} /><SelectField label={t('Branch')} value={branch} onChange={setBranch} options={branches} /><Field label={t('Last Filled Date')} value={lastFilled} onChange={setLastFilled} type="date" /></FormShell>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="info"><span>{label}</span><strong>{value}</strong></div>; }

function FuelEntry({ states, initialPlate, onCancel, onSave }: { states: VehicleState[]; initialPlate?: string; onCancel: () => void; onSave: (r: FuelRecord) => void }) {
  const dueStates = states.filter(v => v.statusLabel === 'Due');
  const fallbackPlate = dueStates[0]?.plate ?? states[0]?.plate ?? '';
  const [plate, setPlate] = useState(initialPlate && states.some(item => item.plate === initialPlate) ? initialPlate : fallbackPlate);
  useEffect(() => {
    if (initialPlate && states.some(item => item.plate === initialPlate)) setPlate(initialPlate);
    else if (!states.some(item => item.plate === plate)) setPlate(fallbackPlate);
  }, [initialPlate, states, plate, fallbackPlate]);
  const v = states.find(x => x.plate === plate) ?? states[0];
  const [date, setDate] = useState(dateKey(new Date()));
  const [odometer, setOdometer] = useState('');
  const [amount, setAmount] = useState('5200');
  const [method, setMethod] = useState('Telebirr');
  const [reason, setReason] = useState('Normal');
  const lockedToInitialVehicle = Boolean(initialPlate && states.some(item => item.plate === initialPlate));
  return <FormShell title="Fuel Entry" subtitle="Record a normal fuel fill. Saving starts a new fuel cycle." onCancel={onCancel} onSubmit={() => v && onSave({ id: Date.now(), date, time: formatTime(), plate: v.plate, vehicle: v.code, odometer: Number(odometer) || 0, amount: Number(amount) || 0, method, reason, timing: 'Normal (Due Date)' })} submitLabel="Save & Start New Cycle">{lockedToInitialVehicle ? <div className="field"><span>{translateStatic("Vehicle")}</span><div className="input-like">{v ? `${v.name} — ${v.plate}` : ''}</div></div> : <SelectField label="Vehicle" value={plate} onChange={setPlate} options={states.map(x => x.plate)} labels={Object.fromEntries(states.map(x => [x.plate, `${x.name} — ${x.plate}`]))} />}<Field label="Date" value={date} onChange={setDate} type="date" /><Field label="Odometer" value={odometer} onChange={setOdometer} type="number" min={0} /><Field label="Amount" value={amount} onChange={setAmount} type="number" min={0} /><SelectField label="Payment Method" value={method} onChange={setMethod} options={['Telebirr', 'Cash', 'Bank']} /><SelectField label="Reason" value={reason} onChange={setReason} options={['Normal', 'Operational Need']} /><div className="alert compact"><CheckCircle2 size={18} /><span>{v ? `${v.plate} is ${v.statusLabel}. Current cycle: ${v.workingDays}/${v.cycle} working days.` : 'Select a vehicle.'}</span></div></FormShell>;
}

function EarlyFill({ states, onCancel, onSave }: { states: VehicleState[]; onCancel: () => void; onSave: (r: FuelRecord) => void }) {
  const [plate, setPlate] = useState(states[0]?.plate ?? '');
  useEffect(() => {
    if (!states.some(item => item.plate === plate)) setPlate(states[0]?.plate ?? '');
  }, [states, plate]);
  const v = states.find(x => x.plate === plate) ?? states[0];
  const [date, setDate] = useState(dateKey(new Date()));
  const [odometer, setOdometer] = useState('');
  const [amount, setAmount] = useState('5000');
  const [method, setMethod] = useState('Telebirr');
  const [reason, setReason] = useState('Operational Need');
  const [note, setNote] = useState('Long trip or exceptional operational need');
  return <FormShell title="Early Fill" subtitle="Record a fill before the expected date without resetting the normal cycle." onCancel={onCancel} onSubmit={() => v && onSave({ id: Date.now(), date, time: formatTime(), plate: v.plate, vehicle: v.code, odometer: Number(odometer) || 0, amount: Number(amount) || 0, method, reason, timing: 'Early Fill', overrideReason: note })} submitLabel="Record Early Fill"><SelectField label="Vehicle" value={plate} onChange={setPlate} options={states.map(x => x.plate)} labels={Object.fromEntries(states.map(x => [x.plate, `${x.name} — ${x.plate}`]))} /><Field label="Date" value={date} onChange={setDate} type="date" /><Field label="Odometer" value={odometer} onChange={setOdometer} type="number" min={0} /><div className="warning-box"><AlertTriangle size={18} /><span>Expected date: {v ? formatDate(v.expected) : '—'}. The scheduled cycle will be preserved.</span></div><Field label="Amount (ETB)" value={amount} onChange={setAmount} type="number" /><SelectField label="Payment Method" value={method} onChange={setMethod} options={['Telebirr', 'Cash', 'Bank']} /><SelectField label="Reason" value={reason} onChange={setReason} options={['Operational Need', 'Long Trip', 'Emergency']} /><Field label="Note" value={note} onChange={setNote} /></FormShell>;
}

function ManualOverride({ states, onCancel, onSave }: { states: VehicleState[]; onCancel: () => void; onSave: (r: FuelRecord) => void }) {
  const [plate, setPlate] = useState(states[0]?.plate ?? '');
  useEffect(() => {
    if (!states.some(item => item.plate === plate)) setPlate(states[0]?.plate ?? '');
  }, [states, plate]);
  const v = states.find(x => x.plate === plate) ?? states[0];
  const [date, setDate] = useState(dateKey(new Date()));
  const [odometer, setOdometer] = useState('');
  const [amount, setAmount] = useState('5000');
  const [method, setMethod] = useState('Telebirr');
  const [reason, setReason] = useState('Emergency');
  const [approvedBy, setApprovedBy] = useState('Fleet Manager');
  return <FormShell title="Manual Override" subtitle="Register an exceptional fuel decision without destroying the vehicle's normal cycle." onCancel={onCancel} onSubmit={() => v && onSave({ id: Date.now(), date, time: formatTime(), plate: v.plate, vehicle: v.code, odometer: Number(odometer) || 0, amount: Number(amount) || 0, method, reason, timing: 'Manual Override', overrideReason: reason, approvedBy })} submitLabel="Record Override"><SelectField label="Vehicle" value={plate} onChange={setPlate} options={states.map(x => x.plate)} labels={Object.fromEntries(states.map(x => [x.plate, `${x.name} — ${x.plate}`]))} /><Field label="Date" value={date} onChange={setDate} type="date" /><Field label="Odometer" value={odometer} onChange={setOdometer} type="number" min={0} /><SelectField label="Payment Method" value={method} onChange={setMethod} options={['Telebirr', 'Cash', 'Bank']} /><Field label="Amount (ETB)" value={amount} onChange={setAmount} type="number" /><SelectField label="Override Reason" value={reason} onChange={setReason} options={['Emergency', 'Operational Need', 'Long Trip', 'Other']} /><Field label="Approved By" value={approvedBy} onChange={setApprovedBy} /><div className="warning-box"><AlertTriangle size={18} /><span>{translateStatic("Audit data will include the reason, approving officer, date and time.")}</span></div></FormShell>;
}

function FilledConfirmation({ record, onDone }: { record?: FuelRecord; onDone: () => void }) {
  const { t } = useLanguage();
  return <div className="content"><div className="success-card"><div className="success-icon"><CheckCircle2 size={48} /></div><h2>{record?.timing === 'Normal (Due Date)' ? t('Fuel saved and new cycle started!') : t('Fuel event recorded!')}</h2><p>{record?.plate} · {record?.vehicle}</p><div className="confirmation-grid"><Info label={t('Date')} value={`${formatDate(record?.date ?? new Date())} ${record?.time ?? ''}`} /><Info label={t('Amount')} value={`${(record?.amount ?? 0).toLocaleString()} ${t('ETB (Birr)')}`} /><Info label={t('Timing')} value={record?.timing ? t(record.timing) : '—'} /><Info label={t('Reason')} value={record?.reason ? t(record.reason) : '—'} /></div><button className="primary wide" onClick={onDone}>{t('OK')}</button></div></div>;
}

function WorkingCalendar({ states, offDays, initialPlate, onSave, onDelete }: { states: VehicleState[]; offDays: OffDay[]; initialPlate?: string; onSave: (entries: OffDay[]) => void; onDelete: (plate: string, date: string) => void }) {
  const { t, lang } = useLanguage();
  const today = new Date();
  const todayKey = dateKey(today);
  const initialView = lang === 'am' ? (() => { const e = toEthiopic(today); return fromEthiopic(e.year, e.month, 1); })() : new Date(today.getFullYear(), today.getMonth(), 1);
  const [plate, setPlate] = useState(initialPlate || states[0]?.plate || '__ALL__');
  const [month, setMonth] = useState(initialView);
  const [selectedDate, setSelectedDate] = useState('');
  const [reason, setReason] = useState('Garage');
  const [note, setNote] = useState('Vehicle under maintenance');
  useEffect(() => { if (initialPlate && states.some(v => v.plate === initialPlate)) setPlate(initialPlate); }, [initialPlate, states]);
  useEffect(() => { const e = toEthiopic(today); setMonth(lang === 'am' ? fromEthiopic(e.year, e.month, 1) : new Date(today.getFullYear(), today.getMonth(), 1)); }, [lang]);
  const targets = plate === '__ALL__' ? states : states.filter(v => v.plate === plate);
  const selectedOff = selectedDate ? offDays.filter(o => o.date === selectedDate && targets.some(v => v.plate === o.plate)) : [];
  const saveSelected = () => { if (!selectedDate || !targets.length) return; onSave(targets.map((v, i) => ({ id: Date.now() + i, plate: v.plate, date: selectedDate, reason, note }))); };
  const deleteSelected = () => { if (!selectedDate) return; onDelete(plate, selectedDate); setSelectedDate(''); };
  const eth = toEthiopic(month);
  const displayMonth = lang === 'am' ? eth.month : month.getMonth() + 1;
  const displayYear = lang === 'am' ? eth.year : month.getFullYear();
  const days = lang === 'am' ? (displayMonth === 13 ? (displayYear % 4 === 3 ? 6 : 5) : 30) : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDate = lang === 'am' ? fromEthiopic(displayYear, displayMonth, 1) : new Date(month.getFullYear(), month.getMonth(), 1);
  const blanks = (firstDate.getDay() + 6) % 7;
  const moveMonth = (delta: number) => {
    if (lang === 'am') {
      let nextMonth = displayMonth + delta;
      let nextYear = displayYear;
      if (nextMonth < 1) { nextMonth = 13; nextYear -= 1; }
      if (nextMonth > 13) { nextMonth = 1; nextYear += 1; }
      setMonth(fromEthiopic(nextYear, nextMonth, 1));
    } else {
      setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    }
    setSelectedDate('');
  };
  const weekdays = lang === 'am' ? ['ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ', 'እሁድ'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return <div className="content"><div className="section-title row-between"><div><h2>{t('Working Calendar')}</h2><p className="muted">{t('Select a vehicle and a date on the calendar.')}</p></div><label className="field calendar-vehicle-select"><span>{t('Vehicle')}</span><select value={plate} onChange={e => { setPlate(e.target.value); setSelectedDate(''); }}><option value="__ALL__">{t('All Vehicles')}</option>{states.map(v => <option key={v.plate} value={v.plate}>{v.code} · {v.plate}</option>)}</select></label></div><div className="calendar-head"><button type="button" className="icon-btn" onClick={() => moveMonth(-1)} aria-label={lang === 'am' ? 'ቀዳሚ ወር' : 'Previous month'}><ChevronLeft /></button><h2>{formatMonthTitle(month)}</h2><button type="button" className="icon-btn" onClick={() => moveMonth(1)} aria-label={lang === 'am' ? 'ቀጣይ ወር' : 'Next month'}><ChevronRight /></button></div><div className="calendar-card"><div className="weekdays">{weekdays.map(d => <span key={d}>{d}</span>)}</div><div className="days">{Array.from({ length: blanks + days }, (_, i) => { const n=i-blanks+1; if(n<1) return <div key={i} className="day"/>; const d = lang === 'am' ? fromEthiopic(displayYear, displayMonth, n) : new Date(month.getFullYear(), month.getMonth(), n); const key=dateKey(d); const hasOff=offDays.some(o=>o.date===key && targets.some(v=>v.plate===o.plate)); return <button type="button" key={i} className={'day day-button '+(d.getDay()===0?'sunday ':'')+(hasOff?'off ':'')+(key===todayKey?'today ':'')+(selectedDate===key?'selected-day':'')} onClick={() => setSelectedDate(key)}>{n}</button>; })}</div><div className="legend"><span><i className="dot green-dot"/> {t('Working Day')}</span><span><i className="dot red-dot"/> {t('Off-Day')}</span><span><i className="dot amber-dot"/> {t('Sunday/Custom')}</span></div>{selectedDate && <div className="calendar-selection-panel"><strong>{formatDate(selectedDate)} · {plate==='__ALL__'?t('All Vehicles'):plate}</strong><span>{selectedOff.length ? selectedOff.length+' / '+targets.length+' selected' : t('Working Day')}</span><div className="form-actions"><button type="button" className="primary" onClick={saveSelected}><Plus size={16}/> {t('Save selected off-day')}</button>{selectedOff.length>0 && <button type="button" className="outline danger-action" onClick={deleteSelected}><X size={16}/> {t('Delete selected off-day')}</button>}</div></div>}</div><div className="mini-summary"><strong>{states.length} {t('vehicles')}</strong><span>{offDays.length} {t('custom off-days')} · {t('Sundays excluded automatically')}</span></div></div>;
}

function AddOffDay({ states, onCancel, onSave }: { states: VehicleState[]; onCancel: () => void; onSave: (e: OffDay[]) => void }) {
  const { t } = useLanguage();
  const [plate, setPlate] = useState(states[0]?.plate ?? '');
  const [date, setDate] = useState(dateKey(new Date()));
  const [reason, setReason] = useState('Garage');
  const [note, setNote] = useState('Vehicle under maintenance');
  const isAmharic = localStorage.getItem('omni_ffm_lang') === 'am'; const save = () => { if (!plate || !date.trim()) return; const targets = plate === '__ALL__' ? states : states.filter(v => v.plate === plate); onSave(targets.map((v, i) => ({ id: Date.now() + i, plate: v.plate, date: date.trim(), reason, note }))); }; return <FormShell title={t('Add Off-Day')} subtitle={t("This date will be excluded from the selected vehicle's working-day fuel cycle.")} onCancel={onCancel} onSubmit={save} submitLabel={t('Save Off-Day')}><SelectField label={t('Vehicle')} value={plate} onChange={setPlate} options={['__ALL__', ...states.map(v => v.plate)]} /><div className="field"><span>{t('Date')}</span>{isAmharic ? <EthiopianDatePicker value={date} onChange={setDate} /> : <input type="date" value={date} onChange={e => setDate(e.target.value)} />}</div><div className="muted" style={{ marginTop: -8, marginBottom: 8 }}>{date ? formatDate(date) : ''}</div><SelectField label={t('Reason')} value={reason} onChange={setReason} options={['Garage', 'Breakdown', 'Driver N/A', 'Holiday', 'Other']} /><Field label={t('Note')} value={note} onChange={setNote} /></FormShell>;
}

function OffDayHistory({ offDays }: { offDays: OffDay[] }) {
  const { t } = useLanguage();
  return <div className="content"><div className="table-card"><table><thead><tr><th>#</th><th>{t('Date')}</th><th>{t('Plate')}</th><th>{t('Reason')}</th><th>{t('Note')}</th><th>{t('Impact')}</th></tr></thead><tbody>{offDays.map((o, i) => <tr key={o.id}><td>{i + 1}</td><td><strong>{formatDate(o.date)}</strong></td><td>{o.plate}</td><td>{t(o.reason)}</td><td>{o.note}</td><td>{t('Excluded from working days')}</td></tr>)}</tbody></table></div></div>;
}

function FuelPriority({ states, onSelect, initialFilter = 'All' }: { states: VehicleState[]; onSelect: (v: Vehicle) => void; initialFilter?: 'All' | 'Due' | 'Near Due' | 'Safe' }) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'All' | 'Due' | 'Near Due' | 'Safe'>(initialFilter);
  const activeStates = states.filter(v => v.status === 'Active');
  const counts = {
    All: activeStates.length,
    Due: activeStates.filter(v => v.statusLabel === 'Due').length,
    'Near Due': activeStates.filter(v => v.statusLabel === 'Near Due').length,
    Safe: activeStates.filter(v => v.statusLabel === 'Safe').length,
  };
  const filtered = filter === 'All' ? activeStates : activeStates.filter(v => v.statusLabel === filter);
  const ordered = [...filtered].sort(prioritySort);
  const filters: Array<{ key: 'All' | 'Due' | 'Near Due' | 'Safe'; label: string; tone: string }> = [
    { key: 'All', label: 'All', tone: 'all' },
    { key: 'Due', label: 'Due', tone: 'red' },
    { key: 'Near Due', label: 'Near Due', tone: 'amber' },
    { key: 'Safe', label: 'Safe', tone: 'green' },
  ];
  return <div className="content"><div className="priority-banner"><strong>{t('Fuel Priority — Management View')}</strong><div><span className="status due">{counts.Due} {t('Due')}</span><span className="status near">{counts['Near Due']} {t('Near Due')}</span><span className="status safe">{counts.Safe} {t('Safe')}</span></div></div><div className="chips">{filters.map(item => <button type="button" key={item.key} className={'chip ' + item.tone + (filter === item.key ? ' chip-active' : '')} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{t(item.label)} ({counts[item.key]})</button>)}</div><div className="table-card"><table><thead><tr><th>{t('Priority')}</th><th>{t('Vehicle')}</th><th>{t('Name')}</th><th>{t('Phone')}</th><th>{t('Plate')}</th><th>{t('Working Days')}</th><th>{t('Cycle')}</th><th>{t('Expected Fuel Date')}</th><th>{t('Status')}</th><th>{t('Decision')}</th></tr></thead><tbody>{ordered.length ? ordered.map((v, i) => <tr key={v.id}><td><strong>{i + 1}</strong></td><td>{v.code}</td><td><button type="button" className="link-btn vehicle-name-link" onClick={() => onSelect(v)}>{v.name}</button></td><td><a className="phone-link" href={`tel:${v.phone}`} aria-label={`${t('Call')} ${v.phone}`}>{v.phone}</a></td><td>{v.plate}</td><td>{v.workingDays}</td><td>{v.cycle}</td><td>{formatDate(v.expected)}</td><td><Status state={v} /></td><td><button className="small-btn" onClick={() => onSelect(v)}>{t('Review')}</button></td></tr>) : <tr><td colSpan={10} className="empty-state">{t('No vehicles in this priority filter')}</td></tr>}</tbody></table></div><div className="alert compact"><Gauge size={18} /><span>{t('The system calculates and ranks priority. The manager makes the final fuel decision.')}</span></div></div>;
}

function FuelHistory({ fuel, states, onSelect }: { fuel: FuelRecord[]; states: VehicleState[]; onSelect: (v: Vehicle) => void }) {
  const { t } = useLanguage();
  const exportCsv = () => { const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`; const rows = [['No','Date','Name','Phone','Plate','Amount (ETB)','Method','Timing','Reason / Approval'], ...fuel.map((f,i) => { const v = states.find(item => item.plate === f.plate); return [i + 1, `${formatDate(f.date)} ${f.time}`, v?.name || f.vehicle, v?.phone || '', f.plate, f.amount, f.method, f.timing, `${f.reason || ''}${f.approvedBy ? ` · ${f.approvedBy}` : ''}`]; })]; const blob = new Blob([`\uFEFF${rows.map(r => r.map(q).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `omni-fleet-fuel-history-${dateKey(new Date())}.csv`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <div className="content"><div className="filterbar"><div><h2 className="plain-title">{t('Fuel History')}</h2><span className="muted">{t('Every fuel event, including early fills and manual overrides')}</span></div><button type="button" className="outline" onClick={exportCsv}><Download size={16} /> {t('Export')}</button></div><div className="table-card"><table><thead><tr><th>#</th><th>{t('Date')}</th><th>{t('Name')}</th><th>{t('Phone')}</th><th>{t('Plate')}</th><th>{t('Amount')}</th><th>{t('Method')}</th><th>{t('Timing')}</th><th>{t('Reason / Approval')}</th></tr></thead><tbody>{fuel.map((f, i) => { const v = states.find(item => item.plate === f.plate); return <tr key={f.id}><td>{i + 1}</td><td>{formatDate(f.date)} {f.time}</td><td>{v ? <button type="button" className="link-btn vehicle-name-link" onClick={() => onSelect(v)}>{v.name}</button> : f.vehicle}</td><td>{v ? <a className="phone-link" href={`tel:${v.phone}`} aria-label={`${t('Call')} ${v.phone}`}>{v.phone}</a> : '—'}</td><td>{f.plate}</td><td>{f.amount.toLocaleString()} ETB</td><td>{f.method}</td><td>{f.timing}</td><td>{f.reason}{f.approvedBy ? ` · ${t('Approved By')} ${f.approvedBy}` : ''}</td></tr>; })}</tbody></table></div></div>;
}

function MonthlyFinanceBoard({ states, offDays, fuel, settings, onSelect }: { states: VehicleState[]; offDays: OffDay[]; fuel: FuelRecord[]; settings: AppSettings; onSelect: (v: Vehicle) => void }) {
  const { t } = useLanguage();
  const [month, setMonth] = useState(dateKey(new Date()).slice(0, 7));
  const [expandedOffDays, setExpandedOffDays] = useState<number | null>(null);
  const monthStart = parseDate(`${month}-01`);
  const today = new Date();
  const isCurrentMonth = month === dateKey(today).slice(0, 7);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const lastIncluded = isCurrentMonth ? today : monthEnd;
  const getEnteredDays = (plate: string) => {
    if (monthStart > lastIncluded) return 0;
    const endDay = new Date(lastIncluded.getFullYear(), lastIncluded.getMonth(), lastIncluded.getDate());
    let count = 0;
    for (let d = new Date(monthStart); d <= endDay; d.setDate(d.getDate() + 1)) {
      const key = dateKey(d);
      const sunday = settings.sundayOff && d.getDay() === 0;
      const customOff = offDays.some(o => o.plate === plate && o.date === key);
      const workedSunday = sunday && fuel.some(f => f.plate === plate && f.date === key);
      if ((!sunday || workedSunday) && !customOff) count += 1;
    }
    return count;
  };
  const totalMonthDays = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  return <div className="detail-tab-panel"><div className="section-title row-between"><div><h2>{t('Monthly Vehicle Finance')}</h2><p className="muted">{t('Each vehicle is calculated separately. Total days follow the selected calendar month.')}</p></div><label className="field month-inline"><span>{t('Month')}</span><input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label></div><div className="table-card"><table><thead><tr><th>#</th><th>{t('Vehicle')}</th><th>{t('Plate')}</th><th>{t('Branch')}</th><th>{t('Total Days')}</th><th>{t('Entered Days')}</th><th>{t('Remaining Days')}</th><th>{t('Off-Days')}</th></tr></thead><tbody>{states.map((v, i) => { const entered = getEnteredDays(v.plate); const remaining = Math.max(0, totalMonthDays - entered); const vehicleOffDays = offDays.filter(o => o.plate === v.plate && o.date.slice(0, 7) === month).sort((a,b) => a.date.localeCompare(b.date)); const expanded = expandedOffDays === v.id; return <React.Fragment key={v.id}><tr><td>{i + 1}</td><td><button type="button" className="link-btn vehicle-name-link" onClick={() => onSelect(v)}>{v.name || v.code}</button><div className="muted">{v.code}</div></td><td>{v.plate}</td><td>{v.branch}</td><td><strong>{totalMonthDays}</strong></td><td><strong>{entered}</strong></td><td><strong>{remaining}</strong></td><td><button type="button" className="small-btn" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setExpandedOffDays(prev => prev === v.id ? null : v.id); }} aria-expanded={expanded}>{vehicleOffDays.length} {t('Off-Days')}</button></td></tr>{expanded && <tr><td colSpan={8}><div className="offday-list-box">{vehicleOffDays.length ? <div>{vehicleOffDays.map(o => <span key={o.id}><strong>{formatDate(o.date)}</strong> · {t(o.reason)}{o.note ? ` · ${o.note}` : ''}</span>)}</div> : <span>{t('No off-day records for this vehicle.')}</span>}</div></td></tr>}</React.Fragment>; })}</tbody></table></div></div>;
}

function MonthlyReport({ fuel, states, onSelect }: { fuel: FuelRecord[]; states: VehicleState[]; onSelect: (v: Vehicle) => void }) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom Range'>('Daily');
  const [customStart, setCustomStart] = useState(dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(dateKey(new Date()));
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayKey = dateKey(now);
  const weekStartKey = dateKey(startOfWeek);
  const monthStartKey = dateKey(startOfMonth);
  const currentMonthKey = monthStartKey.slice(0, 7);
  const normalizeReportDate = (value: unknown) => {
    const raw = String(value ?? '').trim();
    const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const slash = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (slash) return `${slash[3]}-${pad(Number(slash[1]))}-${pad(Number(slash[2]))}`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : dateKey(parsed);
  };
  const filtered = fuel.filter(f => {
    const recordKey = normalizeReportDate(f.date);
    if (!recordKey) return false;
    if (period === 'Daily') return recordKey === todayKey;
    if (period === 'Weekly') return recordKey >= weekStartKey && recordKey <= todayKey;
    if (period === 'Monthly') return recordKey.slice(0, 7) === currentMonthKey;
    if (period === 'Custom Range') {
      if (customStart > customEnd) return false;
      return recordKey >= customStart && recordKey <= customEnd;
    }
    return recordKey === todayKey;
  });
  const total = filtered.reduce((s, f) => s + f.amount, 0);
  const due = states.filter(v => v.statusLabel === 'Due').length;
  const early = filtered.filter(f => f.timing === 'Early Fill' || f.timing === 'Manual Override').length;
  const chartRows = useMemo(() => { const grouped = new Map<string, number>(); filtered.forEach(record => { const key = normalizeReportDate(record.date); if (key) grouped.set(key, (grouped.get(key) || 0) + record.amount); }); return Array.from(grouped.entries()).sort((a,b) => a[0].localeCompare(b[0])).slice(-7); }, [filtered]);
  const chartMax = Math.max(1, ...chartRows.map(([, amount]) => amount));
  const reportPeriodLabel = period === 'Custom Range' ? `${customStart} to ${customEnd}` : period;
  const exportExcel = () => {
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
    const summary = states.map((vehicle, i) => {
      const records = filtered.filter(f => f.plate === vehicle.plate);
      const uniqueDates = Array.from(new Set(records.map(f => normalizeReportDate(f.date)).filter(Boolean)));
      return {
        no: i + 1,
        name: vehicle.name || vehicle.code || '—',
        plate: vehicle.plate,
        cycle: vehicle.cycle,
        fillCount: records.length,
        totalAmount: records.reduce((sum, f) => sum + f.amount, 0),
        filledDays: uniqueDates.length,
      };
    });
    const headers = ['No', 'ስም', 'ታርጋ ቁጥር', 'የነዳጅ ሳይክል (የሥራ ቀናት)', 'በወሩ የተሞላበት ብዛት', 'ጠቅላላ ብር', 'የተሞላባቸው ቀናት ብዛት'];
    const headerHtml = headers.map(header => `<th>${escapeHtml(header)}</th>`).join('');
    const bodyHtml = summary.map(r => `<tr><td>${r.no}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.plate)}</td><td>${r.cycle}</td><td>${r.fillCount}</td><td>${r.totalAmount.toLocaleString()}</td><td>${r.filledDays}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="UTF-8"><style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #999;padding:7px;text-align:left}th{background:#e8eef5;font-weight:700}td:nth-child(6){text-align:right}</style></head><body><h3>OMNI Fleet — ${escapeHtml(reportPeriodLabel)}</h3><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml || '<tr><td colspan="7">ምንም ዳታ የለም።</td></tr>'}</tbody></table></body></html>`;
    const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omni-fleet-fuel-summary-${period.toLowerCase().replace(/\s+/g, '-')}-${dateKey(new Date())}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportPdf = () => {
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) {
      window.print();
      return;
    }
    const rows = filtered.map((f, i) => { const v = states.find(item => item.plate === f.plate); return `<tr><td>${i + 1}</td><td>${formatDate(f.date)} ${f.time}</td><td>${f.vehicle}</td><td>${v?.name || f.vehicle}</td><td>${v?.phone || ''}</td><td>${f.plate}</td><td>${f.odometer || 0}</td><td>${f.amount.toLocaleString()} ETB</td><td>${f.method}</td><td>${f.timing}</td></tr>`; }).join('');
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>{translateStatic("OMNI Fleet Fuel Report")}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{margin:0 0 6px;font-size:22px}p{margin:4px 0 18px;color:#555}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:7px;text-align:left}th{background:#eee} .summary{display:flex;gap:24px;margin:16px 0;font-weight:700}@media print{body{padding:0}}</style></head><body><h1>{translateStatic("OMNI Fleet Fuel Report")}</h1><p>Report Period: ${reportPeriodLabel}</p><div class="summary"><span>Vehicles: ${states.length}</span><span>Fuel Cost: ${total.toLocaleString()} ETB</span><span>Due Now: ${due}</span><span>Early / Override: ${early}</span></div><table><thead><tr><th>{translateStatic("No")}</th><th>{translateStatic("Date")}</th><th>{translateStatic("Vehicle")}</th><th>{translateStatic("Name")}</th><th>{translateStatic("Phone")}</th><th>{translateStatic("Plate")}</th><th>{translateStatic("Odometer")}</th><th>{translateStatic("Amount")}</th><th>{translateStatic("Method")}</th><th>{translateStatic("Timing")}</th></tr></thead><tbody>${rows || '<tr><td colspan="10">{translateStatic("No fuel records for this period.")}</td></tr>'}</tbody></table><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)};<\\/script></body></html>`);
    popup.document.close();
  };
  const periods = ['Daily', 'Weekly', 'Monthly', 'Custom Range'] as const;
  return <div className="content"><div className="report-head"><div><span>{t('Report Period')}</span><div className="period-tabs">{periods.map(p => <button type="button" key={p} className={period === p ? 'period-active' : ''} aria-pressed={period === p} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPeriod(p); }}>{t(p)}</button>)}</div>{period === 'Custom Range' && <div className="custom-range"><Field label="Start Date" value={customStart} onChange={setCustomStart} type="date" /><Field label="End Date" value={customEnd} onChange={setCustomEnd} type="date" /></div>}</div><div className="report-actions"><button className="outline" type="button" onClick={exportPdf}><Download size={16} /> {t('Export PDF')}</button><button className="primary" type="button" onClick={exportExcel}><Download size={16} /> {t('Export Excel')}</button></div></div><div className="report-stats"><Stat icon={<Car />} label={t('Vehicles')} value={states.length} tone="blue" /><Stat icon={<CircleDollarSign />} label={t('Fuel Cost (ETB)')} value={total} tone="green" /><Stat icon={<AlertTriangle />} label={t('Due Now')} value={due} tone="red" /><Stat icon={<Clock3 />} label={t('Early / Override Events')} value={early} tone="amber" /></div><div className="chart-card"><h2>{t('Fuel Event Overview')}</h2><div className="bars">{chartRows.length ? chartRows.map(([key, amount]) => <div className="bar-wrap" key={key} title={`${formatDate(key)} · ${amount.toLocaleString()} ETB`}><div className="bar" style={{ height: `${Math.max(8, (amount / chartMax) * 132)}px` }} /><span>{formatDate(key).split(' ').slice(0, 2).join(' ')}</span></div>) : <div className="empty-state">{t('No fuel records for this period.')}</div>}</div></div><div className="table-card report-table"><table><thead><tr><th>#</th><th>{t('Date')}</th><th>{t('Vehicle')}</th><th>{t('Name')}</th><th>{t('Phone')}</th><th>{t('Plate')}</th><th>{t('Amount')}</th><th>{t('Method')}</th><th>{t('Timing')}</th></tr></thead><tbody>{filtered.length ? filtered.map((f, i) => { const v = states.find(item => item.plate === f.plate); return <tr key={f.id}><td>{i + 1}</td><td>{formatDate(f.date)} {f.time}</td><td>{f.vehicle}</td><td>{v ? <button type="button" className="link-btn vehicle-name-link" onClick={() => onSelect(v)}>{v.name || t('No name')}</button> : f.vehicle}</td><td>{v ? <a className="phone-link" href={`tel:${v.phone}`} aria-label={`${t('Call')} ${v.phone}`}>{v.phone}</a> : '—'}</td><td>{f.plate}</td><td>{f.amount.toLocaleString()} ETB</td><td>{f.method}</td><td>{f.timing}</td></tr>; }) : <tr><td colSpan={9} className="empty-state">{t('No fuel records for this period.')}</td></tr>}</tbody></table></div></div>;
}

function ProfilePage({ user, photo, onPhotoChange, onNavigate, onNotify }: { user: AppUser | null; photo: string; onPhotoChange: (value: string) => void; onNavigate: (page: string) => void; onNotify: (message: string) => void }) {
  const { t } = useLanguage();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { onNotify(t('Please choose an image file.')); return; }
    if (file.size > 2 * 1024 * 1024) { onNotify(t('Photo must be 2 MB or smaller.')); return; }
    const reader = new FileReader();
    reader.onload = () => onPhotoChange(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
  return <div className="content"><button type="button" className="back-btn profile-back-btn" onClick={() => onNavigate('Dashboard')}><ChevronLeft size={19} /> {t('Home')}</button><div className="profile-card"><div className="profile-cover"><div className="profile-avatar-wrap">{photo ? <img className="profile-avatar" src={photo} alt="Profile" /> : <div className="profile-avatar profile-avatar-placeholder"><UserCircle size={52} /></div>}<button type="button" className="profile-camera" onClick={() => inputRef.current?.click()}><Edit3 size={14} /></button></div></div><div className="profile-body"><h2>{user?.name || t('Administrator')}</h2><p>{user?.phone || user?.email || t('Fleet Manager')}</p><input ref={inputRef} hidden type="file" accept="image/*" onChange={e => choosePhoto(e.target.files?.[0])} /><div className="profile-actions"><button type="button" className="primary" onClick={() => inputRef.current?.click()}><Edit3 size={16} /> {t('Change photo')}</button>{photo && <button type="button" className="outline" onClick={() => onPhotoChange('')}>{t('Remove photo')}</button>}<button type="button" className="outline" onClick={() => onNavigate('Settings')}><Settings size={16} /> {t('Settings')}</button></div><div className="profile-info-grid"><div><span>{t('Full Name')}</span><strong>{user?.name || '—'}</strong></div><div><span>{t('Phone Number')}</span><strong>{user?.phone || '—'}</strong></div><div><span>{t('Account')}</span><strong>{t('Active')}</strong></div></div></div></div></div>;
}

function SettingsPage({ settings, onSave, biometricEnabled, onToggleBiometric }: { settings: AppSettings; onSave: (settings: AppSettings) => void; biometricEnabled: boolean; onToggleBiometric: () => void }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<AppSettings>(settings);
  useEffect(() => setDraft(settings), [settings]);
  return <div className="content"><div className="settings-card"><h2>{t('Fuel Scheduling Rules')}</h2><p className="muted">{t('The system uses management-supplied data. Sundays are excluded by default and vehicle-specific off-days can be registered.')}</p><SelectField label="Default Currency" value={draft.currency} onChange={value => setDraft(prev => ({ ...prev, currency: value as AppSettings['currency'] }))} options={['ETB (Birr)', 'USD']} /><label className="check"><input type="checkbox" checked={draft.sundayOff} onChange={e => setDraft(prev => ({ ...prev, sundayOff: e.target.checked }))} /> {t('Sunday as Off-Day (default)')}</label><label className="check"><input type="checkbox" checked={draft.customOffDays} onChange={e => setDraft(prev => ({ ...prev, customOffDays: e.target.checked }))} /> {t('Enable custom off-days')}</label><label className="check"><input type="checkbox" checked={draft.requireManualApproval} onChange={e => setDraft(prev => ({ ...prev, requireManualApproval: e.target.checked }))} /> {t('Require approval for Manual Override')}</label><button type="button" className="primary" onClick={() => onSave(draft)}>{t('Save Settings')}</button><div className="settings-security"><h2>{t('Biometric Unlock')}</h2><p className="muted">{t('Use Face ID or Fingerprint to unlock this app on this device.')}</p><button type="button" className="primary" onClick={onToggleBiometric}>{t(biometricEnabled ? 'Disable biometric unlock' : 'Enable biometric unlock')}</button></div></div></div>;
}


type AccessAccount = { id: string; full_name?: string; phone?: string; role: string; status: 'active' | 'blocked'; reason?: string };
type AccessDevice = { id: string; status: 'pending' | 'approved' | 'blocked'; device_label?: string; reason?: string; user_id: string; user_name?: string; last_seen_at?: string };

function AccessControlsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<AccessAccount[]>([]);
  const [devices, setDevices] = useState<AccessDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/api/admin/access-controls');
      setAccounts((response.data.accounts || []) as AccessAccount[]);
      setDevices((response.data.devices || []) as AccessDevice[]);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Could not load access controls.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const change = async (kind: 'account' | 'device', targetId: string, operation: 'block' | 'unblock' | 'approve') => {
    const label = kind === 'account' ? 'account' : 'device';
    const reason = operation === 'block' ? window.prompt(`Reason for blocking this ${label} (optional):`) || '' : '';
    if (operation === 'block' && !window.confirm(`Block this ${label}? Existing user and fleet data will not be deleted.`)) return;
    setBusy(targetId); setError('');
    try {
      const response = await api.post('/api/admin/access-controls', { kind, targetId, operation, reason });
      onNotify(response.data.message || 'Access status updated.');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Could not update access status.');
    } finally { setBusy(''); }
  };

  const uniqueDevices = [...new Map<string, AccessDevice>(devices.map(device => [device.id, device] as [string, AccessDevice])).values()];
  return <div className="content">
    <div className="filterbar">
      <div><h2 className="plain-title">{t('Account and Device Access')}</h2><span className="muted">Account blocks apply on every phone. Device blocks apply to every account on that phone.</span></div>
      <button type="button" className="outline" onClick={() => void load()} disabled={loading}>Refresh</button>
    </div>
    {error && <div className="access-control-error"><AlertTriangle size={17} /> {error}</div>}
    {loading ? <div className="access-control-loading">Loading access records…</div> : <>
      <section className="access-control-panel">
        <div className="section-title"><UserCog size={18} /><h2>Accounts</h2></div>
        {accounts.length === 0 ? <p className="muted">No organization accounts found.</p> : accounts.map(account => <div className="access-control-list-row" key={account.id}>
          <div className="access-control-list-main"><strong>{account.full_name || account.phone || account.id}</strong><small>{account.phone || ''} · {account.role}</small><small className={account.status === 'blocked' ? 'access-blocked' : 'muted'}>{account.status === 'blocked' ? 'Blocked' : 'Active'}{account.reason ? ` · ${account.reason}` : ''}</small></div>
          <button type="button" className={account.status === 'blocked' ? 'outline' : 'access-control-danger'} disabled={busy === account.id} onClick={() => void change('account', account.id, account.status === 'blocked' ? 'unblock' : 'block')}>{busy === account.id ? 'Please wait…' : account.status === 'blocked' ? 'Unblock' : 'Block account'}</button>
        </div>)}
      </section>
      <section className="access-control-panel">
        <div className="section-title"><Smartphone size={18} /><h2>Registered devices</h2></div>
        {uniqueDevices.length === 0 ? <p className="muted">No devices have registered yet. Devices appear after a user signs in.</p> : uniqueDevices.map(device => <div className="access-control-list-row" key={device.id}>
          <div className="access-control-list-main"><strong>{device.device_label || 'Registered device'}</strong><small>{device.user_name || 'Fleet user'}{device.last_seen_at ? ` · Last seen ${new Date(device.last_seen_at).toLocaleString()}` : ''}</small><small className={device.status === 'blocked' ? 'access-blocked' : 'muted'}>{device.status}{device.reason ? ` · ${device.reason}` : ''}</small></div>
          <button type="button" className={device.status === 'blocked' ? 'outline' : 'access-control-danger'} disabled={busy === device.id} onClick={() => void change('device', device.id, device.status === 'blocked' ? 'unblock' : device.status === 'pending' ? 'approve' : 'block')}>{busy === device.id ? 'Please wait…' : device.status === 'blocked' ? 'Unblock device' : device.status === 'pending' ? 'Approve device' : 'Block device'}</button>
        </div>)}
      </section>
      <div className="settings-security"><ShieldCheck size={18} /><span>Blocking does not delete the account, memberships, vehicles, fuel history, or organization data.</span></div>
    </>}
  </div>;
}

type RecoveryRequest = {
  id: string;
  user_id: string;
  phone: string;
  full_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

function RecoveryRequestsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/admin/recovery-requests');
      setRequests((response.data.requests || []) as RecoveryRequest[]);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('Could not load recovery requests.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRequests(); }, []);

  const resetPassword = async (request: RecoveryRequest) => {
    const newPassword = passwords[request.id] || '';
    if (newPassword.length < 8) {
      setError(t('The new password must be 8–128 characters.'));
      return;
    }
    setSavingId(request.id);
    setError('');
    try {
      const response = await api.post('/api/admin/recovery-requests/resolve', { requestId: request.id, newPassword });
      setPasswords(previous => ({ ...previous, [request.id]: '' }));
      onNotify(response.data.message || t('Password reset completed. Tell the user to sign in with the new password.'));
      await loadRequests();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('Could not reset the password.'));
    } finally {
      setSavingId(null);
    }
  };

  return <div className="content">
    <div className="filterbar">
      <div><h2 className="plain-title">{t('Pending recovery requests')}</h2><span className="muted">{t('Only requests from users in your organization are shown.')}</span></div>
      <button type="button" className="outline" onClick={() => void loadRequests()} disabled={loading}><History size={16} /> {t('Refresh')}</button>
    </div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {loading ? <div className="settings-card"><p>{t('Checking secure session...')}</p></div> : requests.length === 0 ? <div className="settings-card"><p>{t('No recovery requests found.')}</p></div> :
      <div className="table-card"><table><thead><tr><th>{t('Name')}</th><th>{t('Phone Number')}</th><th>{t('Requested')}</th><th>{t('Status')}</th><th>{t('Administrator action')}</th></tr></thead>
        <tbody>{requests.map(request => <tr key={request.id}>
          <td><strong>{request.full_name}</strong></td>
          <td>{request.phone}</td>
          <td>{new Date(request.created_at).toLocaleString()}</td>
          <td><span className="status-pill">{t(request.status)}</span></td>
          <td>{request.status === 'pending' ? <div className="recovery-action">
            <input aria-label={t('New password for this user')} type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder={t('New password for this user')} value={passwords[request.id] || ''} onChange={event => setPasswords(previous => ({ ...previous, [request.id]: event.target.value }))} />
            <button type="button" className="primary" disabled={savingId === request.id || (passwords[request.id] || '').length < 8} onClick={() => void resetPassword(request)}>{savingId === request.id ? t('Checking...') : t('Reset password')}</button>
          </div> : '—'}</td>
        </tr>)}</tbody></table></div>}
  </div>;
}

function UserManagement({ users, setUsers, onNotify }: { users: UserRecord[]; setUsers: React.Dispatch<React.SetStateAction<UserRecord[]>>; onNotify: (s: string) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Viewer');
  const [openId, setOpenId] = useState<number | null>(null);
  const toggleStatus = (user: UserRecord) => { setUsers(prev => prev.map(item => item.id === user.id ? { ...item, status: item.status === 'Active' ? 'Blocked' : 'Active' } : item)); setOpenId(null); onNotify(user.status === 'Active' ? 'User blocked' : 'User activated'); };
  const deleteUser = (user: UserRecord) => { if (!window.confirm(`Remove ${user.name}?`)) return; setUsers(prev => prev.filter(item => item.id !== user.id)); setOpenId(null); onNotify('User removed'); };
  const editUser = (user: UserRecord) => { const nextName = window.prompt('Edit user name', user.name); if (nextName === null || !nextName.trim()) return; const nextRole = window.prompt('Edit role: Manager, Supervisor, Data Entry or Viewer', user.role); if (nextRole === null) return; const allowed = ['Manager','Supervisor','Data Entry','Viewer']; const normalized = allowed.includes(nextRole.trim()) ? nextRole.trim() : user.role; setUsers(prev => prev.map(item => item.id === user.id ? { ...item, name: nextName.trim(), role: normalized } : item)); setOpenId(null); onNotify('User updated'); };
  return <div className="content"><div className="filterbar"><div><h2 className="plain-title">{translateStatic("System Users")}</h2><span className="muted">{translateStatic("Manager, Supervisor, Data Entry and Viewer access")}</span></div><button className="primary" onClick={() => { if (!name.trim()) return; setUsers(prev => [...prev, { id: Date.now(), name: name.trim(), role, status: 'Active' }]); setName(''); onNotify('User added'); }}><Plus size={17} /> {translateStatic("Add User")}</button></div><div className="form-grid"><Field label="New User Name" value={name} onChange={setName} placeholder="Employee name" /><SelectField label="Role" value={role} onChange={setRole} options={['Manager', 'Supervisor', 'Data Entry', 'Viewer']} /></div><div className="table-card"><table><thead><tr><th>#</th><th>{translateStatic("Name")}</th><th>{translateStatic("Role")}</th><th>{translateStatic("Status")}</th><th>{translateStatic("Action")}</th></tr></thead><tbody>{users.map((u, i) => <tr key={u.id}><td>{i + 1}</td><td><strong>{u.name}</strong></td><td>{u.role}</td><td><span className="active-dot">● {u.status}</span></td><td style={{ position: 'relative' }}><button type="button" className="icon-btn" aria-label={`Actions for ${u.name}`} onClick={() => setOpenId(openId === u.id ? null : u.id)}><MoreVertical size={16} /></button>{openId === u.id && <div className="user-action-menu"><button type="button" onClick={() => editUser(u)}><Edit3 size={14} /> {translateStatic("Edit")}</button><button type="button" onClick={() => toggleStatus(u)}>{u.status === 'Active' ? <EyeOff size={14} /> : <Eye size={14} />} {u.status === 'Active' ? 'Block' : 'Activate'}</button><button type="button" onClick={() => deleteUser(u)}><X size={14} /> {translateStatic("Remove")}</button></div>}</td></tr>)}</tbody></table></div></div>;
}

function FormShell({ title, subtitle, children, onCancel, onSubmit, submitLabel = 'Save' }: { title: string; subtitle: string; children: React.ReactNode; onCancel: () => void; onSubmit: () => void; submitLabel?: string }) {
  const { t } = useLanguage();
  return <div className="content"><div className="form-card"><div className="form-title"><div><h2>{t(title)}</h2><p>{t(subtitle)}</p></div></div><div className="form-grid">{children}</div><div className="form-actions"><button className="outline" type="button" onClick={onCancel}><X size={16} /> {t('Cancel')}</button><button className="primary" type="button" disabled={!String(children).length} onClick={onSubmit}><CheckCircle2 size={16} /> {t(submitLabel)}</button></div></div></div>;
}
function EthiopianDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? toEthiopic(parseDate(value)) : toEthiopic(new Date());
  const [year, setYear] = useState(selected.year);
  const [month, setMonth] = useState(selected.month);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const next = value ? toEthiopic(parseDate(value)) : toEthiopic(new Date());
    setYear(next.year);
    setMonth(next.month);
  }, [value]);
  const daysInMonth = month === 13 ? (year % 4 === 3 ? 6 : 5) : 30;
  const firstDate = fromEthiopic(year, month, 1);
  const firstDay = (firstDate.getDay() + 6) % 7;
  const selectedKey = value ? dateKey(parseDate(value)) : '';
  const choose = (day: number) => { onChange(dateKey(fromEthiopic(year, month, day))); setOpen(false); };
  const moveMonth = (delta: number) => {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 1) { nextMonth = 13; nextYear -= 1; }
    if (nextMonth > 13) { nextMonth = 1; nextYear += 1; }
    setMonth(nextMonth);
    setYear(nextYear);
  };
  const weekdays = ['ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ', 'እሁድ'];
  return <div className="ethiopic-picker" style={{ position: 'relative' }}>
    <button className="ethiopic-picker-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(v => !v); }} style={{ width: '100%', minHeight: 44, border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, background: '#101513', color: '#fff', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation' }}>
      {formatDate(value || new Date())}<span style={{ float: 'right' }}>▾</span>
    </button>
    {open && <div style={{ position: 'absolute', zIndex: 1000, top: 'calc(100% + 6px)', left: 0, width: 320, maxWidth: '90vw', padding: 12, borderRadius: 14, background: '#111714', border: '1px solid rgba(255,255,255,.15)', boxShadow: '0 16px 40px rgba(0,0,0,.45)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" className="icon-btn" onClick={() => moveMonth(-1)} aria-label="ቀዳሚ ወር">‹</button>
        <strong>{ethiopicMonths[month - 1]} {year} ዓ.ም.</strong>
        <button type="button" className="icon-btn" onClick={() => moveMonth(1)} aria-label="ቀጣይ ወር">›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 5 }}>{weekdays.map(d => <span key={d} style={{ fontSize: 11, textAlign: 'center', opacity: .65 }}>{d.slice(0, 1)}</span>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>{Array.from({ length: firstDay + daysInMonth }, (_, i) => { const day = i - firstDay + 1; if (day < 1) return <span key={i} />; const key = dateKey(fromEthiopic(year, month, day)); const active = key === selectedKey; return <button type="button" key={i} onClick={() => choose(day)} style={{ height: 34, border: 0, borderRadius: 8, background: active ? '#168A45' : 'transparent', color: '#fff', cursor: 'pointer' }}>{day}</button>; })}</div>
    </div>}
  </div>;
}

function Field({ label, value, onChange, placeholder, type = 'text', min, step }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: number; step?: number }) {
  const { t, lang } = useLanguage();
  if (type === 'date' && lang === 'am') return <label className="field"><span>{t(label)}</span><EthiopianDatePicker value={value} onChange={onChange} /></label>;
  return <label className="field"><span>{t(label)}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ? t(placeholder) : undefined} min={min} step={step} />{type === 'date' && value ? <span className="muted" style={{ display: 'block', marginTop: 4 }}>{formatDate(value)}</span> : null}</label>;
}
function SelectField({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  const { t } = useLanguage();
  const actual = options.includes(value) ? value : options[0] ?? '';
  return <label className="field">
    <span>{t(label)}</span>
    <select
      aria-label={t(label)}
      value={actual}
      disabled={!options.length}
      onChange={e => onChange(e.currentTarget.value)}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      {options.map(o => <option key={o} value={o}>{labels?.[o] ?? t(o)}</option>)}
    </select>
  </label>;
}

export default App;
