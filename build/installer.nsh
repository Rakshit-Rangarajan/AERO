!macro customInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "AERO comes with a Demo Mode containing simulated workflows for testing and presentation purposes.$\r$\n$\r$\nWould you like to enable Demo Mode?" IDNO skipDemo
  FileOpen $9 "$INSTDIR\demo_mode.flag" w
  FileWrite $9 "enabled"
  FileClose $9
  skipDemo:
!macroend
