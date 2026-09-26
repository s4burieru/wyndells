import { useRef, useState } from "react";

import { Link } from "react-router-dom";

import {
  ChevronsUpDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  LogOutIcon,
  PencilIcon,
  UserIcon,
} from "lucide-react";

import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/utils/cn";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { UserAvatar } from "@/components/common/UserAvatar";

import { roleLabel } from "@/utils/format";

import type { SafeUser } from "@/types";

/**

 * The staff account menu, anchored to the sidebar footer the way shadcn's

 * original account switcher is — a dropdown beside the bottom of the sidebar

 * instead of a centred modal.

 *

 * It gathers what the footer used to spread across four separate blocks:

 * profile, public site and sign out (confirmed before it happens).

 */

export function AccountMenu({
  user,

  onViewProfile,

  onEditProfile,

  onSignOut,
}: {
  user: SafeUser;

  onViewProfile: () => void;

  onEditProfile: () => void;

  onSignOut: () => void;
}) {
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  /** True while the menu closes in order to hand focus off to another overlay. */

  const handingOffRef = useRef(false);

  const handleCopyEmail = () => {
    void navigator.clipboard

      .writeText(user.email)

      .then(() => toast.success("Email address copied."))

      .catch(() => toast.error("Could not copy the email address."));
  };

  /** Opens an overlay from a menu item, so the menu doesn't reclaim focus. */

  const handOff = (open: () => void) => {
    handingOffRef.current = true;

    open();
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                aria-label={`${user.name} — account menu`}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <UserAvatar
                  name={user.name}
                  src={user.avatarUrl}
                  role={user.role}
                  size="xs"
                />

                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-xs font-medium">
                    {user.name}
                  </span>

                  <span className="truncate text-[0.7rem] text-muted-foreground">
                    {user.position || roleLabel(user.role)}
                  </span>
                </div>

                <ChevronsUpDownIcon className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="right"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="w-(--radix-dropdown-menu-trigger-width) min-w-72 rounded-lg"
              onCloseAutoFocus={(event) => {
                if (handingOffRef.current) {
                  handingOffRef.current = false;

                  event.preventDefault();
                }
              }}
            >
              {/* Signed-in account at a glance: photo, name, post and email. */}

              <div className="-mx-1 -mt-1 flex items-center gap-3 px-3 pt-3 pb-2">
                <UserAvatar
                  name={user.name}
                  src={user.avatarUrl}
                  role={user.role}
                  size="sm"
                  className="shrink-0"
                />

                <div className="min-w-0 flex-1 leading-tight">
                  {/* Full name on display: wraps instead of being cut off. */}

                  <span className="block text-sm font-semibold wrap-break-word">
                    {user.name}
                  </span>

                  {user.position ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {user.position}
                    </p>
                  ) : null}

                  <p className="truncate text-xs text-muted-foreground/80">
                    {user.email}
                  </p>
                </div>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => handOff(onViewProfile)}
              >
                <UserIcon />
                View profile
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => handOff(onEditProfile)}
              >
                <PencilIcon />
                Edit profile
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={(event) => {
                  // Keep the menu open so the confirmation toast stays in context.

                  event.preventDefault();

                  handleCopyEmail();
                }}
              >
                <CopyIcon />
                Copy email
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/">
                  <ExternalLinkIcon />
                  Public site
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onSelect={() => handOff(() => setConfirmingSignOut(true))}
              >
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AlertDialog
        open={confirmingSignOut}
        onOpenChange={(next) => {
          if (!next) {
            setConfirmingSignOut(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of the staff portal?</AlertDialogTitle>

            <AlertDialogDescription>
              You&rsquo;ll need to sign in again to access the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={onSignOut}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
