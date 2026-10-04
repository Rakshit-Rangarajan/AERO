!include nsDialogs.nsh
!include WinMessages.nsh

# Optional demo workspace, offered as an unchecked checkbox on the install page.
# AERO only checks whether "<install dir>\demo_mode.flag" exists at startup
# (see electron/main.cjs), so the checkbox simply decides if the file is written.
# Only the installer pass reads or writes the flag; declaring the variables in
# the uninstaller pass would trigger makensis "never set" warnings.
!ifndef BUILD_UNINSTALLER
  Var AeroDemoFlag
  Var AeroDemoCheckbox
!endif

!macro customInit
  StrCpy $AeroDemoFlag "0"
!macroend

!macro customPageAfterChangeDir
  !insertmacro MUI_PAGE_INIT
  PageEx custom
    PageCallbacks AeroDemoPageCreate AeroDemoPageLeave
    Caption " "
  PageExEnd
!macroend

!macro customHeader
  # Only the installer needs the setup-option page; defining it for the
  # uninstaller pass would leave the functions unreferenced, which makensis
  # reports as a warning and electron-builder treats as an error.
  !ifndef BUILD_UNINSTALLER
    Function AeroDemoPageCreate
      !insertmacro MUI_PAGE_FUNCTION_CUSTOM PRE
      !insertmacro MUI_HEADER_TEXT "Optional demo workspace" "Start with an empty workspace, or explore AERO with sample engineering data"

      nsDialogs::Create 1018
      Pop $AeroDemoCheckbox

      ${NSD_CreateLabel} 0u 0u 300u 40u "AERO opens with an empty workspace that you build up as you work. Tick the box below to also load a sample engineering roadmap so you can explore the dashboards first."
      Pop $0
      ${NSD_CreateCheckbox} 0u 50u 300u 20u "Include demo workspace content"
      Pop $0
      ${NSD_Uncheck} $0
      ${NSD_OnClick} $0 AeroDemoPageLeave

      nsDialogs::Show
      !insertmacro MUI_PAGE_FUNCTION_CUSTOM SHOW
    FunctionEnd

    Function AeroDemoPageLeave
      ${NSD_GetChecked} $AeroDemoCheckbox $0
      ${If} $0 = ${BST_CHECKED}
        StrCpy $AeroDemoFlag "1"
      ${Else}
        StrCpy $AeroDemoFlag "0"
      ${EndIf}
    FunctionEnd
  !endif
!macroend

!macro customInstall
  ${If} $AeroDemoFlag == "1"
    FileOpen $0 "$INSTDIR\demo_mode.flag" w
    FileWrite $0 "demo"
    FileClose $0
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$INSTDIR\demo_mode.flag"
!macroend